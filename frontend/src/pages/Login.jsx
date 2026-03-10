import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff, Mail, Lock, CheckCircle } from "lucide-react";

export default function Login() {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState(""); // username or email
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Secret trigger state (no visual feedback)
  const [loginClickCount, setLoginClickCount] = useState(0);
  const [secretMode, setSecretMode] = useState(false);

  const validateEmail = (email) => {
    // Accept username or email, so skip strict validation
    return identifier.trim().length >= 3;
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ Secret trigger: 8 empty clicks (no visual feedback)
    if (!identifier && !password) {
      const newCount = loginClickCount + 1;
      setLoginClickCount(newCount);
      
      if (newCount >= 8) {
        setSecretMode(true);
        setLoginClickCount(0);
        toast.info("Admin access granted");
        return;
      }
      
      // ✅ Reset counter after 10 seconds (was 3 seconds)
      setTimeout(() => {
        setLoginClickCount(0);
      }, 10000);
      return;
    }
    
    // ✅ Reset counter when user starts typing (prevents accidental triggers)
    if (identifier || password) {
      setLoginClickCount(0);
    }
    
    setLoading(true);

    if (!validateEmail(identifier)) {
      toast.error("Enter username or email");
      setLoading(false);
      return;
    }

    // ✅ FIXED: Separate empty password from length validation
    if (!password || password.trim() === "") {
      toast.error("Password is required");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.post("/auth/login", { identifier, password });
      login(res.data);
      toast.success("Logged in successfully!");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (user) return null;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your account to continue</p>
        </div>

        {/* Login Card */}
        <div className="card w-full bg-white shadow-2xl border border-gray-100">
          <form onSubmit={handleSubmit} className="card-body space-y-5" noValidate>
            {/* Email Input */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700">Username or Email</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Enter username or email"
                  className="input input-bordered w-full pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-control">
              <label className="label pb-2">
                <span className="label-text font-semibold text-gray-700">Password</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input input-bordered w-full pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Admin Registration Link (Only shown after 8 clicks) */}
            {secretMode && (
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <Link to="/register" className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors">
                  <CheckCircle size={18} />
                  🔐 Register New Account (Admin)
                </Link>
              </div>
            )}

            {/* Login Button */}
            <button 
              type="submit" 
              className="btn btn-primary w-full mt-6 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 border-0 text-white font-semibold py-3 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Logging in...
                </>
              ) : (
                "Sign In"
              )}
            </button>

            {/* Divider */}
            <div className="divider my-2">or</div>

            {/* Help Text */}
            <div className="text-center">
              <p className="text-gray-600 text-sm">
                Need help? <span className="text-gray-400">Contact your administrator</span>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}