import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ✅ Input Validation Helper Functions
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

// ✅ Register User with Validation & Secret Code Protection
export const registerUser = async (req, res) => {
  try {
    const { username, email, password, secretCode } = req.body;

    // ✅ 1. Check for Secret Code (Required for registration)
    const validCodes = process.env.SECRET_REGISTER_CODES
      ? process.env.SECRET_REGISTER_CODES.split(',')
      : [];

    if (!secretCode || !validCodes.includes(secretCode)) {
      return res.status(403).json({ 
        message: "Registration is restricted. Contact administrator for access." 
      });
    }

    // ✅ 2. Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ 3. Validate password strength (min 8 chars, 1 uppercase, 1 number)
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        message: "Password must be at least 8 characters with 1 uppercase letter and 1 number" 
      });
    }

    // ✅ 4. Validate username (min 3 chars, alphanumeric)
    if (!validateUsername(username)) {
      return res.status(400).json({ 
        message: "Username must be at least 3 characters (letters, numbers, underscores)" 
      });
    }

    // ✅ 5. Check if user already exists (EMAIL)
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ 6. Check if username already exists (NEW!)
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // ✅ 7. Hash password manually (since pre-save hook is removed)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ✅ 8. Create user with password
    const user = await User.create({ 
      username, 
      email, 
      password: hashedPassword 
    });

    // ✅ 9. Generate token
    const token = generateToken(user._id);

    // ✅ 10. Return user data (without password)
    res.status(201).json({ 
      _id: user._id, 
      username: user.username, 
      email: user.email, 
      token 
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ✅ Login User with Validation
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Validate password is not empty
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    // ✅ Find user - EXPLICITLY SELECT password field
    const user = await User.findOne({ email }).select("+password");
    
    // ✅ Check if user exists
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Check if password field exists
    if (!user.password) {
      console.error("❌ User found but password is missing:", user._id);
      return res.status(500).json({ message: "Server error: User password missing" });
    }

    // ✅ Compare password with proper error handling
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (compareError) {
      console.error("Password comparison error:", compareError);
      return res.status(500).json({ message: "Error comparing password" });
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate token
    const token = generateToken(user._id);

    // ✅ Return user data (without password)
    res.json({ 
      _id: user._id, 
      username: user.username, 
      email: user.email, 
      token 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ✅ Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};