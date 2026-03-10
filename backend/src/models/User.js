import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: [true, "Username is required"],
    trim: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [50, "Username cannot exceed 50 characters"],
    match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"]
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email"]
  },
  password: { 
    type: String, 
    required: [true, "Password is required"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false // ✅ Don't return password in queries
  },
  role: { 
    type: String, 
    enum: ["user", "admin"], 
    default: "user" 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lastFailedLogin: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginHistory: [{
    timestamp: { type: Date, default: Date.now },
    ipAddress: String
  }],
  resetPasswordToken: String,
  resetPasswordExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// ✅ Removed pre-save hook to avoid 'next is not a function' error
// ✅ Password is now hashed in the controller instead

export default mongoose.model("User", userSchema);