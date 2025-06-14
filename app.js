import express from "express";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";

import dbConnection from "./config/database.js";
import messageRoutes from "./Routes/chat.js";
import Message from "./models/message.js";
import Conversation from "./models/conversation.js";

// Load env variables
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("❌ JWT_SECRET is not defined in environment variables");
}

const app = express();
const server = http.createServer(app);

// Allowed CORS origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
  transports: ["websocket", "polling"],
});

const onlineUsers = new Map();

// ✅ Socket.IO token verification middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log("❌ Unauthorized socket connection: no token");
    return next(new Error("Unauthorized: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;

    // Clean up old socket if reconnecting
    if (socket.recovered) {
      onlineUsers.delete(decoded.username || decoded.id);
    }

    return next();
  } catch (err) {
    console.log("❌ Invalid token:", err.message);
    return next(new Error("Unauthorized: Invalid token"));
  }
});

// ✅ Socket.IO connection handling
io.on("connection", (socket) => {
  if (!socket.user) {
    console.log("❌ No user attached to socket");
    return socket.disconnect(true);
  }

  const userId = socket.user.username || socket.user.id;
  onlineUsers.set(userId, socket.id);
  console.log(`✅ User ${userId} connected via socket`);

  // Join user to their personal room for direct messaging
  socket.join(userId);

  socket.emit("connection-success", { userId });

  // Broadcast user online status
  socket.broadcast.emit("user-online", { userId });

  // ✅ Handle sending messages with persistence
  socket.on("send-msg", async (data) => {
    try {
      const { receiverId, content, messageId } = data; // Add messageId for deduplication

      if (!receiverId || !content?.trim()) {
        return socket.emit("msg-error", { error: "Invalid message data" });
      }

      const senderId = socket.user.username || socket.user.id;

      // Check if message already exists (deduplication)
      if (messageId) {
        const existingMessage = await Message.findById(messageId);
        if (existingMessage) {
          console.log(`📩 Message already exists: ${messageId}`);
          return socket.emit("msg-sent", {
            _id: existingMessage._id,
            senderId: existingMessage.senderId,
            receiverId: existingMessage.receiverId,
            content: existingMessage.content,
            timestamp: existingMessage.timestamp,
            conversationId: existingMessage.conversationId,
            isRead: existingMessage.isRead,
          });
        }
      }

      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [senderId, receiverId], $size: 2 },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [senderId, receiverId],
        });
      }

      // Save message to database
      const messageData = {
        senderId,
        receiverId,
        content: content.trim(),
        conversationId: conversation._id,
      };

      // Add custom _id if provided for deduplication
      if (messageId) {
        messageData._id = messageId;
      }

      const newMessage = await Message.create(messageData);

      // Update conversation
      conversation.lastMessage = newMessage._id;
      conversation.updatedAt = new Date();
      await conversation.save();

      const responseData = {
        _id: newMessage._id,
        senderId,
        receiverId,
        content: content.trim(),
        timestamp: newMessage.timestamp,
        conversationId: conversation._id,
        isRead: false,
      };

      console.log(`📩 Message saved: ${senderId} → ${receiverId}`);

      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        socket.to(receiverSocketId).emit("msg-receive", responseData);
        socket.emit("msg-delivered", {
          messageId: newMessage._id,
          receiverId,
          timestamp: responseData.timestamp,
        });
      } else {
        socket.emit("msg-offline", {
          messageId: newMessage._id,
          receiverId,
          message: "Recipient is offline. Message saved.",
        });
      }

      // Confirm message sent
      socket.emit("msg-sent", responseData);
    } catch (err) {
      console.error("❌ Send message error:", err);
      // Handle duplicate key error specifically
      if (err.code === 11000) {
        return socket.emit("msg-error", { error: "Message already exists" });
      }
      socket.emit("msg-error", { error: "Failed to send message" });
    }
  });

  // ✅ Handle typing indicators
  socket.on("typing", (data) => {
    const { receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("user-typing", {
        senderId: userId,
        isTyping: true,
      });
    }
  });

  socket.on("stop-typing", (data) => {
    const { receiverId } = data;
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("user-typing", {
        senderId: userId,
        isTyping: false,
      });
    }
  });

  // ✅ Handle message read receipts
  socket.on("mark-read", async (data) => {
    try {
      const { messageIds, conversationId } = data;

      if (messageIds && messageIds.length > 0) {
        await Message.updateMany(
          { _id: { $in: messageIds }, receiverId: userId },
          { isRead: true }
        );
      } else if (conversationId) {
        await Message.updateMany(
          { conversationId, receiverId: userId, isRead: false },
          { isRead: true }
        );
      }

      socket.emit("messages-read", { success: true });
    } catch (err) {
      console.error("❌ Mark read error:", err);
      socket.emit("read-error", { error: "Failed to mark messages as read" });
    }
  });

  // ✅ Handle disconnection
  socket.on("disconnect", (reason) => {
    onlineUsers.delete(userId);
    console.log(`❌ User ${userId} disconnected: ${reason}`);

    // Broadcast user offline status
    socket.broadcast.emit("user-offline", { userId });
  });

  // ✅ Handle socket errors
  socket.on("error", (err) => {
    console.error("Socket error for user", userId, ":", err);
  });
});

// ✅ Express middlewares
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Make onlineUsers available to routes
app.locals.onlineUsers = onlineUsers;

// ✅ Database connection
dbConnection();

// ✅ Routes
app.use("/api/v1/messages", messageRoutes);

// ✅ Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    onlineUsers: onlineUsers.size,
    onlineUsersList: Array.from(onlineUsers.keys()),
  });
});

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested resource was not found",
    timestamp: new Date().toISOString(),
  });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err.stack);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong!"
        : err.message,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`✅ Socket.IO enabled with WebSocket transport`);
});

// ✅ Handle unhandled rejections & exceptions
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

export { io };
