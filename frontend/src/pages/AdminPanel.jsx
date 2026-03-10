import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Trash2, Edit2, Shield, Users, BarChart3, Lock, Search, Ban, CheckCircle, Eye, Key, Activity, X } from "lucide-react";

export default function AdminPanel() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("users");
  const [activityData, setActivityData] = useState([]);
  const [userActivityLogs, setUserActivityLogs] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [systemSettings, setSystemSettings] = useState({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    twoFactorEnabled: false,
    allowUserRegistration: true,
    allowMultipleSessions: false
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Close all modals helper
  const closeAllModals = () => {
    setShowRoleModal(false);
    setShowPasswordModal(false);
    setShowActivityModal(false);
    setShowConfirmModal(false);
    setSelectedUser(null);
    setNewRole("");
    setNewPassword("");
    setConfirmAction(null);
  };

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/dashboard");
      toast.error("Admin access required");
    }
  }, [user, navigate]);

  // Fetch data
  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
      fetchStats();
      if (activeTab === "activity") {
        fetchActivityDashboard();
      }
      if (activeTab === "settings") {
        fetchSystemInfo();
      }
    }
  }, [user, activeTab, searchTerm, filterRole, filterStatus]);

  // Fetch users with filters
  const fetchUsers = async () => {
    try {
      setLoading(true);
      let url = "/admin/users";
      const params = new URLSearchParams();

      if (searchTerm) params.append("search", searchTerm);
      if (filterRole) params.append("role", filterRole);
      if (filterStatus) params.append("status", filterStatus);

      if (params.toString()) {
        url = `/admin/users/search?${params.toString()}`;
      }

      console.log("=== Fetching Users ===");
      console.log("URL:", url);
      console.log("Filters:", { searchTerm, filterRole, filterStatus });
      
      const res = await axiosInstance.get(url);
      
      console.log("Response received:", {
        count: res.data.users?.length,
        users: res.data.users?.map(u => ({ 
          username: u.username, 
          role: u.role, 
          isActive: u.isActive,
          email: u.email 
        }))
      });
      
      setUsers(res.data.users);
      console.log("State updated with", res.data.users.length, "users");
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axiosInstance.get("/admin/stats");
      setStats(res.data.stats);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchActivityDashboard = async () => {
    try {
      const res = await axiosInstance.get("/admin/activity/dashboard");
      setActivityData(res.data.recentActivity);
    } catch (error) {
      toast.error("Failed to fetch activity data");
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const res = await axiosInstance.get("/admin/system-info");
      setSystemInfo(res.data.systemInfo);
    } catch (error) {
      console.error("Failed to fetch system info:", error);
      toast.error("Failed to fetch system information");
    }
  };

  // Load and save system settings
  const saveSystemSettings = async () => {
    try {
      // Save to backend
      const res = await axiosInstance.put("/settings", systemSettings);
      setSettingsSaved(true);
      toast.success("System settings saved to database");
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(error.response?.data?.error || "Failed to save settings");
    }
  };

  const loadSystemSettings = async () => {
    try {
      const res = await axiosInstance.get("/settings");
      if (res.data.settings) {
        setSystemSettings(res.data.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      toast.error("Failed to load system settings");
    }
  };

  // Load settings on mount
  useEffect(() => {
    const initializeSettings = async () => {
      await loadSystemSettings();
    };
    initializeSettings();
  }, []);

  // Handlers
  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) {
      toast.error("Please select a role");
      return;
    }

    try {
      await axiosInstance.put(`/admin/users/${selectedUser._id}/role`, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      setNewRole("");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update role");
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }

    try {
      await axiosInstance.post("/admin/users/reset-password", {
        userId: selectedUser._id,
        newPassword
      });
      toast.success("Password reset successfully");
      setShowPasswordModal(false);
      setSelectedUser(null);
      setNewPassword("");
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    }
  };

  const handleBanUser = async (userId, username) => {
    setConfirmAction({
      title: "Suspend User",
      message: `Are you sure you want to suspend "${username}"? They won't be able to login.`,
      onConfirm: async () => {
        try {
          await axiosInstance.put(`/admin/users/${userId}/ban`);
          toast.success("User suspended");
          fetchUsers();
          closeAllModals();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to suspend user");
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleActivateUser = async (userId, username) => {
    setConfirmAction({
      title: "Activate User",
      message: `Are you sure you want to activate "${username}"? They will be able to login again.`,
      onConfirm: async () => {
        try {
          await axiosInstance.put(`/admin/users/${userId}/activate`);
          toast.success("User activated");
          fetchUsers();
          closeAllModals();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to activate user");
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleUnlockAccount = async (userId, username) => {
    setConfirmAction({
      title: "Unlock Account",
      message: `Are you sure you want to unlock "${username}"? They will be able to login again.`,
      onConfirm: async () => {
        try {
          await axiosInstance.put(`/admin/users/${userId}/unlock`);
          toast.success("Account unlocked");
          fetchUsers();
          closeAllModals();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to unlock account");
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = async (userId, username) => {
    setConfirmAction({
      title: "Delete User",
      message: `Are you sure you want to delete "${username}"? This action cannot be undone.`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/admin/users/${userId}`);
          toast.success("User deleted successfully");
          fetchUsers();
          closeAllModals();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete user");
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleViewActivityLogs = async (userId, username) => {
    try {
      const res = await axiosInstance.get(`/admin/users/${userId}/activity`);
      setUserActivityLogs({ ...res.data.user, username });
      setShowActivityModal(true);
    } catch (error) {
      toast.error("Failed to fetch activity logs");
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkDeleteUsers = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Select users to delete");
      return;
    }

    setConfirmAction({
      title: "Delete Multiple Users",
      message: `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          await axiosInstance.post("/admin/users/bulk/delete", { userIds: selectedUsers });
          toast.success(`Deleted ${selectedUsers.length} users`);
          setSelectedUsers([]);
          fetchUsers();
          closeAllModals();
        } catch (error) {
          toast.error(error.response?.data?.message || "Failed to delete users");
        }
      }
    });
    setShowConfirmModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={32} className="text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Admin Panel</h1>
          </div>
          <p className="text-gray-600">Manage users and system settings</p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users size={32} className="text-blue-500 opacity-30" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Admin Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.admins}</p>
                </div>
                <Shield size={32} className="text-purple-500 opacity-30" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Regular Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.regularUsers}</p>
                </div>
                <Users size={32} className="text-green-500 opacity-30" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">This Month</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.usersCreatedThisMonth}</p>
                </div>
                <BarChart3 size={32} className="text-orange-500 opacity-30" />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-4 px-6 font-semibold text-center transition-all relative ${
                activeTab === "users"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("users")}
            >
              <div className="flex items-center justify-center gap-2">
                <Users size={18} /> User Management
              </div>
              {activeTab === "users" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
            <button
              className={`flex-1 py-4 px-6 font-semibold text-center transition-all relative ${
                activeTab === "activity"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("activity")}
            >
              <div className="flex items-center justify-center gap-2">
                <Activity size={18} /> Activity Dashboard
              </div>
              {activeTab === "activity" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
            <button
              className={`flex-1 py-4 px-6 font-semibold text-center transition-all relative ${
                activeTab === "settings"
                  ? "text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setActiveTab("settings")}
            >
              <div className="flex items-center justify-center gap-2">
                <BarChart3 size={18} /> System Settings
              </div>
              {activeTab === "settings" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t"></div>
              )}
            </button>
          </div>
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email"
                    className="input input-bordered w-full pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <select
                  className="select select-bordered"
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  className="select select-bordered"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterRole("");
                    setFilterStatus("");
                  }}
                  className="btn btn-outline w-full"
                  title="Clear all filters"
                >
                  Clear Filters
                </button>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || filterRole || filterStatus) && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900 mb-2">Active Filters:</p>
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="badge badge-primary">Search: "{searchTerm}"</span>
                    )}
                    {filterRole && (
                      <span className="badge badge-primary">Role: {filterRole}</span>
                    )}
                    {filterStatus && (
                      <span className="badge badge-primary">Status: {filterStatus}</span>
                    )}
                  </div>
                </div>
              )}

              {selectedUsers.length > 0 && (
                <div className="mt-4 flex gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedUsers.length} user(s) selected
                  </span>
                  <button
                    onClick={handleBulkDeleteUsers}
                    className="btn btn-sm btn-error"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                        <input
                          type="checkbox"
                          className="checkbox checkbox-primary"
                          onChange={(e) => {
                            const otherUsers = users.filter(u => u._id !== user._id);
                            if (e.target.checked) {
                              setSelectedUsers(otherUsers.map(u => u._id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          checked={selectedUsers.length === users.filter(u => u._id !== user._id).length && users.filter(u => u._id !== user._id).length > 0}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Lock Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.filter(u => u._id !== user._id).map((u) => (
                        <tr key={u._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-primary"
                              checked={selectedUsers.includes(u._id)}
                              onChange={() => handleSelectUser(u._id)}
                            />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{u.username}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {u.role === "admin" ? <Shield size={14} /> : <Lock size={14} />}
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              u.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}>
                              {u.isActive ? "Active" : "Suspended"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {u.failedLoginAttempts > 0 ? (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                🔒 Locked ({u.failedLoginAttempts})
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Unlocked
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewRole(u.role);
                                  setShowRoleModal(true);
                                }}
                                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                                title="Change role"
                              >
                                <Edit2 size={16} />
                              </button>
                              {u.isActive ? (
                                <button
                                  onClick={() => handleBanUser(u._id, u.username)}
                                  className="p-2 hover:bg-orange-100 rounded-lg text-orange-600 transition"
                                  title="Suspend user"
                                >
                                  <Ban size={16} />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateUser(u._id, u.username)}
                                  className="p-2 hover:bg-green-100 rounded-lg text-green-600 transition"
                                  title="Activate user"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              {u.failedLoginAttempts > 0 && (
                                <button
                                  onClick={() => handleUnlockAccount(u._id, u.username)}
                                  className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                                  title="Unlock account"
                                >
                                  🔓
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedUser(u);
                                  setShowPasswordModal(true);
                                }}
                                className="p-2 hover:bg-purple-100 rounded-lg text-purple-600 transition"
                                title="Reset password"
                              >
                                <Key size={16} />
                              </button>
                              <button
                                onClick={() => handleViewActivityLogs(u._id, u.username)}
                                className="p-2 hover:bg-cyan-100 rounded-lg text-cyan-600 transition"
                                title="View activity"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u._id, u.username)}
                                className="p-2 hover:bg-red-100 rounded-lg text-red-600 transition"
                                title="Delete user"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Username</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Login</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total Logins</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {activityData.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No activity data available
                      </td>
                    </tr>
                  ) : (
                    activityData.map((data, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{data.username}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{data.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {data.lastLogin
                            ? new Date(data.lastLogin).toLocaleString()
                            : "Never"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{data.totalLogins}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            data.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}>
                            {data.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">System Configuration</h2>
              <button
                onClick={saveSystemSettings}
                className={`btn ${settingsSaved ? "btn-success" : "btn-primary"}`}
              >
                {settingsSaved ? "✓ Saved" : "Save Settings"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password Policy Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock size={20} className="text-blue-600" />
                Password Policy
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Minimum Password Length</label>
                  <input
                    type="number"
                    value={systemSettings.passwordMinLength}
                    onChange={(e) => setSystemSettings({ ...systemSettings, passwordMinLength: parseInt(e.target.value) })}
                    className="input input-bordered w-full mt-2"
                    min="6"
                    max="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {systemSettings.passwordMinLength} characters</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={systemSettings.passwordRequireUppercase}
                    onChange={(e) => setSystemSettings({ ...systemSettings, passwordRequireUppercase: e.target.checked })}
                    className="checkbox checkbox-primary"
                  />
                  <label className="text-sm font-medium text-gray-700">Require Uppercase Letters</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={systemSettings.passwordRequireNumbers}
                    onChange={(e) => setSystemSettings({ ...systemSettings, passwordRequireNumbers: e.target.checked })}
                    className="checkbox checkbox-primary"
                  />
                  <label className="text-sm font-medium text-gray-700">Require Numbers</label>
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} className="text-green-600" />
                Session & Security
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                  <input
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings({ ...systemSettings, sessionTimeout: parseInt(e.target.value) })}
                    className="input input-bordered w-full mt-2"
                    min="5"
                    max="480"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {systemSettings.sessionTimeout} minutes</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Max Login Attempts</label>
                  <input
                    type="number"
                    value={systemSettings.maxLoginAttempts}
                    onChange={(e) => setSystemSettings({ ...systemSettings, maxLoginAttempts: parseInt(e.target.value) })}
                    className="input input-bordered w-full mt-2"
                    min="2"
                    max="10"
                  />
                  <p className="text-xs text-gray-500 mt-1">Current: {systemSettings.maxLoginAttempts} attempts</p>
                </div>
              </div>
            </div>

            {/* Account & Registration Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-purple-600" />
                Account Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={systemSettings.allowUserRegistration}
                    onChange={(e) => setSystemSettings({ ...systemSettings, allowUserRegistration: e.target.checked })}
                    className="checkbox checkbox-primary"
                  />
                  <label className="text-sm font-medium text-gray-700">Allow User Registration</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={systemSettings.allowMultipleSessions}
                    onChange={(e) => setSystemSettings({ ...systemSettings, allowMultipleSessions: e.target.checked })}
                    className="checkbox checkbox-primary"
                  />
                  <label className="text-sm font-medium text-gray-700">Allow Multiple Sessions per User</label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={systemSettings.twoFactorEnabled}
                    onChange={(e) => setSystemSettings({ ...systemSettings, twoFactorEnabled: e.target.checked })}
                    className="checkbox checkbox-primary"
                  />
                  <label className="text-sm font-medium text-gray-700">Enable Two-Factor Authentication</label>
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-orange-600" />
                System Information
              </h3>
              {systemInfo ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">System Version:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.systemVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Environment:</span>
                    <span className="font-semibold text-gray-900 capitalize">{systemInfo.environment}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database Status:</span>
                    <span className={`font-semibold ${systemInfo.databaseStatus === "Connected" ? "text-green-600" : "text-red-600"}`}>
                      {systemInfo.databaseStatus === "Connected" ? "✓" : "✗"} {systemInfo.databaseStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Database Name:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.databaseName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Node Version:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Files Uploaded:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.totalFilesUploaded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Storage Used:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.totalStorageUsed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Server Uptime:</span>
                    <span className="font-semibold text-gray-900">{systemInfo.serverUptime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="font-semibold text-gray-900 text-xs">{systemInfo.timestamp}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  Loading system information...
                </div>
              )}
            </div>
          </div>
          </>
        )}

        {/* Role Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Change Role for {selectedUser.username}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeAllModals}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="flex-1 btn btn-primary"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Password Modal */}
        {showPasswordModal && selectedUser && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Reset Password for {selectedUser.username}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  className="input input-bordered w-full"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-gray-500 text-xs mt-2">Must have: 8+ characters, 1 uppercase, 1 number</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeAllModals}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 btn btn-primary"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Activity Logs Modal */}
        {showActivityModal && userActivityLogs && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-6 max-h-96 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  Activity Logs - {userActivityLogs.username}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Email:</span> {userActivityLogs.email}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Last Login:</span>{" "}
                  {userActivityLogs.lastLogin
                    ? new Date(userActivityLogs.lastLogin).toLocaleString()
                    : "Never"}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Total Logins:</span> {userActivityLogs.totalLogins}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Login History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userActivityLogs.loginHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">No login history</p>
                  ) : (
                    userActivityLogs.loginHistory.map((log, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-2 bg-gray-50 rounded">
                        <span className="text-gray-900">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="text-gray-500">{log.ipAddress || "N/A"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={closeAllModals}
                className="btn btn-primary w-full mt-4"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Confirmation Modal */}
        {showConfirmModal && confirmAction && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={closeAllModals}>
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-bold ${confirmAction.isDangerous ? "text-red-600" : "text-gray-900"}`}>
                  {confirmAction.title}
                </h3>
                <button
                  onClick={closeAllModals}
                  className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-6">
                {confirmAction.message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={closeAllModals}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className={`flex-1 btn ${confirmAction.isDangerous ? "btn-error" : "btn-primary"}`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
