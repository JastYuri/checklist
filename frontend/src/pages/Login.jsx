import { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { AuthContext } from "../context/AuthContext";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Secret trigger state (no visual feedback)
  const [loginClickCount, setLoginClickCount] = useState(0);
  const [secretMode, setSecretMode] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ Secret trigger: 8 empty clicks (no visual feedback)
    if (!email && !password) {
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
    if (email || password) {
      setLoginClickCount(0);
    }
    
    setLoading(true);

    if (!validateEmail(email)) {
      toast.error("Invalid email format");
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
      const res = await axiosInstance.post("/auth/login", { email, password });
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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex-col lg:flex-row-reverse">
        {/* Illustration / branding */}
        <div className="text-center lg:text-left">
          <h1 className="text-5xl font-bold">Welcome Back 👋</h1>
          <p className="py-6">
            Sign in to continue to <span className="font-bold">Checklist App</span>.
          </p>
        </div>

        {/* Login card */}
        <div className="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
          {/* ✅ ADDED: noValidate to disable browser native validation */}
          <form onSubmit={handleSubmit} className="card-body" noValidate>
            <h2 className="text-2xl font-bold text-center mb-4">Login</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Email</span>
              </label>
              {/* ✅ REMOVED: required attribute */}
              <input
                type="email"
                placeholder="you@example.com"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Password</span>
              </label>
              <div className="relative w-full">
                {/* ✅ REMOVED: required attribute */}
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input input-bordered w-full pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* ✅ Register Link (Only shown after 8 clicks) */}
            {secretMode && (
              <div className="form-control mt-4">
                <label className="label">
                  <Link to="/register" className="label-text-alt link link-primary">
                    🔐 Register New Account (Admin Only)
                  </Link>
                </label>
              </div>
            )}

            {/* ✅ Normal Register Link (Hidden) */}
            {!secretMode && (
              <label className="label">
                <span className="label-text-alt text-gray-400">
                 
                </span>
              </label>
            )}

            <div className="form-control mt-6">
              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Logging in...
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}