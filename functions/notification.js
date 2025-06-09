import Notification from "../models/notification.js";
import User from "../models/userModel.js";

const createNotification = async (userId, title, message, type = "info") => {
  try {

    // Validate title and message
    if (!title || !message) {
      throw new Error("Title and message are required");
    }

    // Check for duplicate notifications (e.g., the same title and message for a user)
    const existingNotification = await Notification.findOne({
      userId,
      title,
      message,
    });
    if (existingNotification) {
      return {
        success: false,
        message: "Duplicate notification. No new notification created.",
      };
    }

    // Create the new notification
    const newNotification = new Notification({
      userId,
      title,
      message,
      type,
    });

    await newNotification.save();

    // Optionally, you could send an email or SMS here

    return {
      success: true,
      message: "Notification created successfully",
      notification: newNotification,
    };
    
  } catch (error) {
    console.error("Error creating notification:", error);
    return {
      success: false,
      message: "Failed to create notification",
      error: error.message,
    };
  }
};


const sendNotificationToRoles = async (
  roles,
  title,
  message,
  type = "info"
) => {
  try {

    // console.log("Debugging sendNotificationToRoles", roles, title, message, type);

    const users = await User.find({ role: { $in: roles } });
    if (!users.length) {
      console.log("Debugging sendNotificationToRoles", "No users found with roles: ", roles);
      return {
        success: false,
        message: `No users found with roles: ${roles.join(", ")}`,
      };
    }

    //  console.log("Debugging sendNotificationToRoles", users);
    // Send the notification to each user
    const notifications = [];
    for (const user of users) {
      const result = await createNotification(user._id, title, message, type);
      if (result.success) {
        notifications.push(result.notification);
      }
    }

    //  console.log("Debugging sendNotificationToRoles", notifications);

    return {
      success: true,
      message: `${notifications.length} notifications sent to users with roles: ${roles.join(", ")}`,
      notifications,
    };
  } catch (error) {
    console.error("Error sending notifications to roles:", error);
    return {
      success: false,
      message: "Failed to send notifications",
      error: error.message,
    };
  }
};


export { createNotification, sendNotificationToRoles };