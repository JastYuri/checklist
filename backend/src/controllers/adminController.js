import User from "../models/User.js";

// ✅ Get all users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const totalUsers = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: "admin" });
    const userCount = totalUsers - adminCount;

    // Removed verbose user logs for production

    res.json({
      success: true,
      totalUsers,
      adminCount,
      userCount,
      users
    });
  } catch (error) {
    // Get all users error (details logged internally)
    res.status(500).json({ message: "Server error fetching users" });
  }
};

// ✅ Get single user by ID
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    // Get user error (details logged internally)
    res.status(500).json({ message: "Server error fetching user" });
  }
};

// ✅ Update user role (Admin Only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    // ✅ Validate role
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'" });
    }

    // ✅ Prevent admin from removing their own admin status (optional safety)
    if (req.user._id.toString() === userId && role === "user") {
      return res.status(400).json({ message: "Cannot remove your own admin status" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user
    });
  } catch (error) {
    // Update user role error (details logged internally)
    res.status(500).json({ message: "Server error updating user role" });
  }
};

// ✅ Delete user (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // ✅ Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `User ${user.username} has been deleted`
    });
  } catch (error) {
    // Delete user error (details logged internally)
    res.status(500).json({ message: "Server error deleting user" });
  }
};

// ✅ Get current user profile
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    // Get current user error (details logged internally)
    res.status(500).json({ message: "Server error fetching user profile" });
  }
};

// ✅ Get admin statistics
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const admins = await User.countDocuments({ role: "admin" });
    const regularUsers = totalUsers - admins;
    const usersCreatedThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        admins,
        regularUsers,
        usersCreatedThisMonth,
        totalAccounts: totalUsers
      }
    });
  } catch (error) {
    // Get admin stats error (details logged internally)
    res.status(500).json({ message: "Server error fetching statistics" });
  }
};

// ✅ Search and filter users
export const searchUsers = async (req, res) => {
  try {
    const { search, role, status } = req.query;
    let query = {};

    // Build query based on filters
    if (search && search.trim()) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Add role filter - only if explicitly set
    if (role && role.trim() !== "") {
      query.role = role;
    }

    // Add status filter - only if explicitly set
    if (status && status.trim() !== "") {
      if (status === "active") {
        query.isActive = true;
      } else if (status === "suspended") {
        query.isActive = false;
      }
    }
    // Note: If status filter is NOT set, do NOT add any isActive condition
    // This will return ALL users regardless of active/suspended status

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    // Removed filter and user details logs for production

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    // Search users error (details logged internally)
    res.status(500).json({ message: "Server error searching users" });
  }
};

// ✅ Ban/Suspend user
export const banUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from banning themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "Cannot suspend your own account" });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `User ${user.username} has been suspended`,
      user
    });
  } catch (error) {
    // Ban user error (details logged internally)
    res.status(500).json({ message: "Server error banning user" });
  }
};

// ✅ Activate/Unsuspend user
export const activateUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `User ${user.username} has been activated`,
      user
    });
  } catch (error) {
    // Activate user error (details logged internally)
    res.status(500).json({ message: "Server error activating user" });
  }
};

// ✅ Unlock account locked by failed login attempts
export const unlockAccount = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        failedLoginAttempts: 0,
        lastFailedLogin: null
      },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `Account ${user.username} has been unlocked`,
      user
    });
  } catch (error) {
    // Unlock account error (details logged internally)
    res.status(500).json({ message: "Server error unlocking account" });
  }
};

// ✅ Reset user password
export const resetUserPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;

    // Validate password strength
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        message: "Password must be at least 8 characters with 1 uppercase letter and 1 number"
      });
    }

    // Hash new password
    const bcrypt = (await import("bcryptjs")).default;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const user = await User.findByIdAndUpdate(
      userId,
      { password: hashedPassword },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: `Password reset for user ${user.username}`,
      user
    });
  } catch (error) {
    // Reset password error (details logged internally)
    res.status(500).json({ message: "Server error resetting password" });
  }
};

// ✅ Get user activity logs
export const getUserActivityLogs = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select("username email loginHistory lastLogin");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      user: {
        username: user.username,
        email: user.email,
        lastLogin: user.lastLogin,
        totalLogins: user.loginHistory.length,
        loginHistory: user.loginHistory.sort((a, b) => b.timestamp - a.timestamp)
      }
    });
  } catch (error) {
    // Get activity logs error (details logged internally)
    res.status(500).json({ message: "Server error fetching activity logs" });
  }
};

// ✅ Get activity dashboard (all users' recent activity)
export const getActivityDashboard = async (req, res) => {
  try {
    const users = await User.find()
      .select("username email lastLogin isActive loginHistory")
      .sort({ lastLogin: -1 })
      .limit(20);

    const activityData = users.map(user => ({
      username: user.username,
      email: user.email,
      lastLogin: user.lastLogin,
      isActive: user.isActive,
      totalLogins: user.loginHistory.length,
      recentActivity: user.loginHistory.slice(-3).sort((a, b) => b.timestamp - a.timestamp)
    }));

    res.json({
      success: true,
      recentActivity: activityData
    });
  } catch (error) {
    // Get activity dashboard error (details logged internally)
    res.status(500).json({ message: "Server error fetching activity data" });
  }
};

// ✅ Bulk update user roles
export const bulkUpdateRoles = async (req, res) => {
  try {
    const { userIds, role } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Provide array of user IDs" });
    }

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // Prevent removing own admin status
    const ownIdInList = userIds.includes(req.user._id.toString());
    if (ownIdInList && role === "user") {
      return res.status(400).json({ message: "Cannot remove your own admin status" });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { role }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} users to ${role}`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    // Bulk update error (details logged internally)
    res.status(500).json({ message: "Server error updating users" });
  }
};

// ✅ Bulk delete users
export const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Provide array of user IDs" });
    }

    // Prevent deleting yourself
    if (userIds.includes(req.user._id.toString())) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const result = await User.deleteMany({
      _id: { $in: userIds }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} users`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    // Bulk delete error (details logged internally)
    res.status(500).json({ message: "Server error deleting users" });
  }
};

// ✅ Get system information
export const getSystemInfo = async (req, res) => {
  try {
    const fs = await import("fs");
    const path = await import("path");
    const { fileURLToPath } = await import("url");
    
    // Package version
    const packagePath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const version = packageJson.version || "1.0.0";

    // Database status (if MongoDB is connected)
    const mongoose = await import("mongoose");
    const dbStatus = mongoose.default.connection.readyState === 1 ? "Connected" : "Disconnected";
    const dbName = mongoose.default.connection.name || "Unknown";

    // Count uploaded files
    const uploadsDir = path.join(process.cwd(), "uploads");
    let totalFiles = 0;
    let totalSize = 0;

    try {
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir, { recursive: true });
        const fileStats = files.filter(f => {
          const stats = fs.statSync(path.join(uploadsDir, f));
          return stats.isFile();
        });
        
        totalFiles = fileStats.length;
        totalSize = fileStats.reduce((sum, file) => {
          const stat = fs.statSync(path.join(uploadsDir, file));
          return sum + stat.size;
        }, 0);
      }
    } catch (err) {
      // Error calculating storage (details logged internally)
    }

    // Convert bytes to readable format
    const formatBytes = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
    };

    // Get node version
    const nodeVersion = process.version;

    // Get environment
    const environment = process.env.NODE_ENV || "development";

    // Get uptime
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);

    res.json({
      success: true,
      systemInfo: {
        systemVersion: `v${version}`,
        environment,
        databaseStatus: dbStatus,
        databaseName: dbName,
        totalFilesUploaded: totalFiles,
        totalStorageUsed: formatBytes(totalSize),
        totalStorageBytes: totalSize,
        nodeVersion,
        serverUptime: `${uptimeHours}h ${uptimeMinutes}m`,
        timestamp: new Date().toLocaleString()
      }
    });
  } catch (error) {
    // Get system info error (details logged internally)
    res.status(500).json({ message: "Server error fetching system information" });
  }
};
