import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Lock } from "lucide-react";

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
    <div className="flex items-center justify-center h-screen bg-base-200 p-4">
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-sm bg-base-100 shadow-xl p-6"
      >
        <h2 className="text-xl font-bold mb-4 text-center">Register</h2>

        {/* ✅ Secret Code Field (Admin Only) */}
        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">
              <Lock size={14} className="inline mr-1" />
              Secret Access Code
            </span>
          </label>
          <input
            type="password"
            placeholder="Enter secret code"
            className="input input-bordered w-full"
            value={secretCode}
            onChange={(e) => setSecretCode(e.target.value)}
            required
          />
          <label className="label">
            <span className="label-text-alt text-gray-500 text-xs">
              Contact administrator for access code
            </span>
          </label>
        </div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Username</span>
          </label>
          <input
            type="text"
            placeholder="Username"
            className="input input-bordered w-full"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Email</span>
          </label>
          <input
            type="email"
            placeholder="Email"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Password</span>
          </label>
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="input input-bordered w-full pr-12"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <label className="label">
            <span className="label-text-alt text-gray-500 text-xs">
              Min 8 chars, 1 uppercase, 1 number
            </span>
          </label>
        </div>

        <div className="form-control mb-3">
          <label className="label">
            <span className="label-text">Confirm Password</span>
          </label>
          <div className="relative w-full">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              className="input input-bordered w-full pr-12"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full mb-3" disabled={loading}>
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Registering...
            </>
          ) : (
            "Register"
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate("/login")}
          className="btn btn-outline w-full"
        >
          ← Back to Login
        </button>
      </form>
    </div>
  );
}