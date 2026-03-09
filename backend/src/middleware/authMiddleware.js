import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ Protect Routes - Verify Token
export const protect = async (req, res, next) => {
  try {
    let token;

    // ✅ Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // ✅ Check if token exists
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    try {
      // ✅ Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      next();
    } catch (error) {
      return res.status(401).json({ message: "Token is invalid or expired" });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ message: "Server error in authentication" });
  }
};

// ✅ Check if user owns the resource (Prevent accessing other accounts' data)
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // ✅ Check if user role matches allowed roles
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Not authorized to access this resource" });
    }

    next();
  };
};

// ✅ Check if user owns the specific resource (by ID)
export const authorizeOwnResource = (resourceIdField = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // ✅ Get resource ID from request params or body
    const resourceId = req.params[resourceIdField] || req.body[resourceIdField];

    if (!resourceId) {
      return res.status(400).json({ message: "Resource ID required" });
    }

    // ✅ Check if user owns this resource
    if (resourceId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to access this resource" });
    }

    next();
  };
};

export default protect;