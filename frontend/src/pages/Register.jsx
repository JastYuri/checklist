import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock, Mail, User, Shield, Check } from "lucide-react";

export default function Register() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretCode, setSecretCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  };

  const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
    return usernameRegex.test(username);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(email)) {
      toast.error("Invalid email format");
      setLoading(false);
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Password must be at least 8 characters with 1 uppercase letter and 1 number");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!validateUsername(username)) {
      toast.error("Username must be at least 3 characters (letters, numbers, underscores)");
      setLoading(false);
      return;
    }

    // ✅ Validate secret code before sending
    if (!secretCode) {
      toast.error("Secret access code is required");
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.post("/auth/register", {
        username,
        email,
        password,
        secretCode, // ✅ Send secret code to backend
      });
      login(res.data);
      toast.success("Registered successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-indigo-500 to-blue-600 rounded-full mb-4 shadow-lg">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join as an admin member</p>
        </div>

        {/* Register Card */}
        <div className="card w-full bg-white shadow-2xl border border-gray-100">
          <form onSubmit={handleSubmit} className="card-body space-y-4" noValidate>
            {/* Secret Code Field */}
            <div className="form-control bg-linear-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-2">
              <label className="label pb-2">
                <span className="label-text font-semibold text-red-700 flex items-center gap-2">
                  <Shield size={18} />
                  Secret Access Code
                </span>
              </label>
              <input
                type="password"
                placeholder="Enter your access code"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
              />
              <label className="label pt-2">
                <span className="label-text-alt text-red-600 text-xs font-medium">
                  🔒 Required - Contact administrator for access code
                </span>
              </label>
            </div>

            {/* Username Field */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <User size={18} />
                  Username
                </span>
              </label>
              <input
                type="text"
                placeholder="Choose a username"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <label className="label pt-1">
                <span className="label-text-alt text-gray-500 text-xs">Min 3 chars (letters, numbers, underscores)</span>
              </label>
            </div>

            {/* Email Field */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Mail size={18} />
                  Email Address
                </span>
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                className="input input-bordered w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Field */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700 flex items-center gap-2">
                  <Lock size={18} />
                  Password
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  className="input input-bordered w-full pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <label className="label pt-1">
                <span className="label-text-alt text-gray-500 text-xs flex items-center gap-1">
                  <Check size={14} className="text-green-600" /> Min 8 characters, 1 uppercase, 1 number
                </span>
              </label>
            </div>

            {/* Confirm Password Field */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700">Confirm Password</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  className="input input-bordered w-full pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3.5 text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Register Button */}
            <button 
              type="submit" 
              className="btn btn-primary w-full mt-6 bg-linear-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 border-0 text-white font-semibold py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>

            {/* Divider */}
            <div className="divider my-2">Already have an account?</div>

            {/* Back to Login */}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="btn btn-outline w-full border-2 text-gray-700 hover:bg-gray-50 font-semibold rounded-lg"
            >
              ← Back to Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}