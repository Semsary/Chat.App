import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

// JWT middleware for authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token." });
  }
};

// Get current user info
router.get("/me", authenticateToken, (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
    },
  });
});

// Search users (for starting new conversations)
router.get("/search", authenticateToken, async (req, res) => {
  const { query } = req.query;

  try {
    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        error: "Search query must be at least 2 characters long",
      });
    }

    // This is a placeholder - implement based on your user model
    // For now, returning mock data
    const mockUsers = [
      { id: "user1", username: "john_doe", email: "john@example.com" },
      { id: "user2", username: "jane_smith", email: "jane@example.com" },
    ].filter(
      (user) =>
        user.username.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
    );

    res.status(200).json({
      success: true,
      users: mockUsers,
    });
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Failed to search users" });
  }
});

export default router;
