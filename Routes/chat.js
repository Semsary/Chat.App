import express from "express";
import Message from "../models/message.js";
import Conversation from "../models/conversation.js";
import jwt from "jsonwebtoken"; // Fixed: Remove destructuring

const router = express.Router();

// JWT middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user to request
    req.userId = decoded.id || decoded.userId || decoded.username; // Extract consistent user ID
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token." });
  }
};

// Create/Send message
router.post("/", authenticateToken, async (req, res) => {
  const { receiverId, content, messageId } = req.body; // Add messageId for deduplication
  const senderId = req.userId; // Get from JWT token

  console.log(
    "Received message from:",
    senderId,
    "to:",
    receiverId,
    "content:",
    content,
    "messageId:",
    messageId
  );

  try {
    // Validate input
    if (!receiverId || !content?.trim()) {
      return res.status(400).json({
        error: "Missing required fields: receiverId and content",
      });
    }

    // Check if message already exists (deduplication)
    if (messageId) {
      const existingMessage = await Message.findById(messageId);
      if (existingMessage) {
        console.log(`📩 Message already exists: ${messageId}`);
        return res.status(200).json({
          success: true,
          message: existingMessage,
          duplicate: true,
        });
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
      });
    }

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

    // const newMessage = await Message.create(messageData);

    // conversation.lastMessage = newMessage._id;
    // conversation.updatedAt = new Date();
    // await conversation.save();

    res.status(201).json({
      success: true,
      message: "newMessage",
    });
  } catch (err) {
    console.error("Error creating message:", err);
    // Handle duplicate key error specifically
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Message already exists",
        duplicate: true,
      });
    }
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get messages between users
router.get("/", authenticateToken, async (req, res) => {
  const { receiverId, page = 1, limit = 500 } = req.query;
  const senderId = req.userId; // Get from JWT token
  console.log(
    "Fetching messages for sender:",
    senderId,
    "receiver:",
    receiverId,
    "page:",
    page,
    "limit:",
    limit
  );
  try {
    if (!receiverId) {
      return res.status(400).json({
        error: "Missing required query parameter: receiverId",
      });
    }

    // const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ timestamp: -1 });
    // .limit(parseInt(limit))
    // .skip(skip);

    // Mark messages as read where current user is the receiver
    await Message.updateMany(
      {
        senderId: receiverId,
        receiverId: senderId,
        isRead: false,
      },
      { isRead: true }
    );

    // Reverse to get chronological order
    messages.reverse();

    res.status(200).json({
      success: true,
      messages: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit),
      },
    });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to retrieve messages" });
  }
});

// Get user's conversations
router.get("/conversations", authenticateToken, async (req, res) => {
  const authenticatedUserId = req.userId; // Get from JWT token
  const userId = authenticatedUserId; // Use query param or authenticated user ID
  try {
    // Verify user can only access their own conversations
    if (authenticatedUserId !== userId) {
      return res.status(403).json({
        error: "Unauthorized: Cannot access conversations for other users",
      });
    }

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    // Add unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          receiverId: userId,
          isRead: false,
        });

        return {
          ...conv.toObject(),
          unreadCount,
          otherParticipant: conv.participants.find((p) => p !== userId),
        };
      })
    );

    res.status(200).json({
      success: true,
      conversations: conversationsWithUnread,
    });
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Mark messages as read
router.patch("/read", authenticateToken, async (req, res) => {
  const { conversationId, messageIds } = req.body;
  const userId = req.userId; // Get from JWT token

  try {
    let result;

    if (messageIds && messageIds.length > 0) {
      // Mark specific messages as read
      result = await Message.updateMany(
        {
          _id: { $in: messageIds },
          receiverId: userId,
          isRead: false,
        },
        { isRead: true }
      );
    } else if (conversationId) {
      // Mark all unread messages in conversation as read
      result = await Message.updateMany(
        {
          conversationId,
          receiverId: userId,
          isRead: false,
        },
        { isRead: true }
      );
    } else {
      return res.status(400).json({
        error: "Either conversationId or messageIds must be provided",
      });
    }

    res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: "Messages marked as read",
    });
  } catch (err) {
    console.error("Error marking messages as read:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Get online users
router.get("/online-users", authenticateToken, async (req, res) => {
  try {
    // This will be populated by Socket.IO
    res.status(200).json({
      success: true,
      onlineUsers: Array.from(req.app.locals.onlineUsers || []),
    });
  } catch (err) {
    console.error("Error fetching online users:", err);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

export default router;
