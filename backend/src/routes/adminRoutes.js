import express from "express";
import {
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  getCurrentUser,
  getAdminStats,
  searchUsers,
  banUser,
  activateUser,
  unlockAccount,
  resetUserPassword,
  getUserActivityLogs,
  getActivityDashboard,
  bulkUpdateRoles,
  bulkDeleteUsers,
  getSystemInfo
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ All admin routes require authentication and admin role
router.use(protect); // Must be authenticated
router.use(authorize("admin")); // Must be admin

// ✅ Get current user profile
router.get("/profile", getCurrentUser);

// ✅ Get all users
router.get("/users", getAllUsers);

// ✅ Search and filter users
router.get("/users/search", searchUsers);

// ✅ Get single user
router.get("/users/:id", getUserById);

// ✅ Get user activity logs
router.get("/users/:id/activity", getUserActivityLogs);

// ✅ Update user role
router.put("/users/:id/role", updateUserRole);

// ✅ Delete user
router.delete("/users/:id", deleteUser);

// ✅ Ban/Suspend user
router.put("/users/:id/ban", banUser);

// ✅ Activate/Unsuspend user
router.put("/users/:id/activate", activateUser);

// ✅ Unlock account (failed login attempts)
router.put("/users/:id/unlock", unlockAccount);

// ✅ Reset user password
router.post("/users/reset-password", resetUserPassword);

// ✅ Get admin statistics
router.get("/stats", getAdminStats);

// ✅ Get system information
router.get("/system-info", getSystemInfo);

// ✅ Get activity dashboard
router.get("/activity/dashboard", getActivityDashboard);

// ✅ Bulk operations
router.post("/users/bulk/update-role", bulkUpdateRoles);
router.post("/users/bulk/delete", bulkDeleteUsers);

export default router;
