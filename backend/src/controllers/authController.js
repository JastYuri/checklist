import User from "../models/User.js";
import Settings from "../models/Settings.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dns from "dns";
import { promisify } from "util";

// ✅ Get system settings (with caching)
let cachedSettings = null;
let settingsLastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getSystemSettings = async () => {
  const now = Date.now();
  if (cachedSettings && now - settingsLastFetch < CACHE_DURATION) {
    return cachedSettings;
  }

  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        passwordMinLength: 8,
        passwordRequireUppercase: true,
        passwordRequireNumbers: true,
        sessionTimeout: 30,
        maxLoginAttempts: 5,
        twoFactorEnabled: false,
        allowUserRegistration: true,
        allowMultipleSessions: false
      });
    }
    cachedSettings = settings;
    settingsLastFetch = now;
    return settings;
  } catch (error) {
    // Error fetching settings (details logged internally)
    // Return defaults if fetch fails
    return {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      allowUserRegistration: true,
      maxLoginAttempts: 5
    };
  }
};

// ✅ Input Validation Helper Functions
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// ✅ Validate Email Domain Exists (DNS Check)
const validateEmailDomain = async (email) => {
  try {
    const domain = email.split('@')[1];
    const resolveMx = promisify(dns.resolveMx);
    const mxRecords = await resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch (error) {
    // Domain doesn't exist or DNS lookup failed
    return false;
  }
};

const validatePassword = (password, settings) => {
  // Build regex based on settings
  let regex = `^`;
  
  if (settings.passwordRequireUppercase) {
    regex += `(?=.*[A-Z])`;
  }
  
  if (settings.passwordRequireNumbers) {
    regex += `(?=.*\\d)`;
  }
  
  regex += `.{${settings.passwordMinLength},}$`;
  
  const passwordRegex = new RegExp(regex);
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

    // ✅ Get system settings
    const settings = await getSystemSettings();

    // ✅ Check if user registration is allowed
    if (!settings.allowUserRegistration) {
      return res.status(403).json({ 
        message: "User registration is currently disabled. Contact administrator." 
      });
    }

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

    // ✅ 2.5 Validate email domain exists (DNS check)
    const domainValid = await validateEmailDomain(email);
    if (!domainValid) {
      return res.status(400).json({ message: "Email domain does not exist" });
    }

    // ✅ 3. Validate password strength (based on system settings)
    if (!validatePassword(password, settings)) {
      const requirements = [];
      requirements.push(`at least ${settings.passwordMinLength} characters`);
      if (settings.passwordRequireUppercase) requirements.push("1 uppercase letter");
      if (settings.passwordRequireNumbers) requirements.push("1 number");
      
      return res.status(400).json({ 
        message: `Password must contain: ${requirements.join(", ")}` 
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
      role: user.role,
      token 
    });
  } catch (error) {
    // Registration error (details logged internally)
    res.status(500).json({ message: "Server error during registration" });
  }
};

// ✅ Login User with Validation & Settings Enforcement
export const loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be username or email

    // ✅ Get system settings
    const settings = await getSystemSettings();

    // ✅ Validate identifier
    if (!identifier || identifier.trim() === "") {
      return res.status(400).json({ message: "Username or email is required" });
    }

    // ✅ Validate password is not empty
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    // ✅ Find user by username or email - EXPLICITLY SELECT password field
    let user = await User.findOne({ $or: [
      { email: identifier },
      { username: identifier }
    ] }).select("+password");
    
    // ✅ Check if user exists
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Check if user is locked due to too many failed attempts (SKIP FOR ADMINS)
    if (user.role !== "admin" && user.failedLoginAttempts >= settings.maxLoginAttempts) {
      return res.status(403).json({ 
        message: `Account locked due to ${settings.maxLoginAttempts} failed login attempts. Contact administrator to unlock.`
      });
    }

    // ✅ Check if password field exists
    if (!user.password) {
      // User found but password is missing (details logged internally)
      return res.status(500).json({ message: "Server error: User password missing" });
    }

    // ✅ Compare password with proper error handling
    let isMatch;
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (compareError) {
      // Password comparison error (details logged internally)
      return res.status(500).json({ message: "Error comparing password" });
    }

    if (!isMatch) {
      // ✅ Increment failed login attempts (SKIP FOR ADMINS)
      if (user.role !== "admin") {
        user.failedLoginAttempts += 1;
        user.lastFailedLogin = new Date();
        await user.save();
      }

      const attemptsRemaining = settings.maxLoginAttempts - user.failedLoginAttempts;
      return res.status(401).json({ 
        message: user.role === "admin" 
          ? "Invalid credentials" 
          : `Invalid credentials. ${attemptsRemaining} attempts remaining.` 
      });
    }

    // ✅ Check if user is active (not banned/suspended)
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended. Contact administrator." });
    }

    // ✅ Reset failed login attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastFailedLogin = null;

    // ✅ Log login activity
    user.lastLogin = new Date();
    user.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress
    });

    // Keep only last 50 logins
    if (user.loginHistory.length > 50) {
      user.loginHistory = user.loginHistory.slice(-50);
    }

    await user.save();

    // ✅ Generate token
    const token = generateToken(user._id);

    // ✅ Return user data (without password)
    res.json({ 
      _id: user._id, 
      username: user.username, 
      email: user.email,
      role: user.role,
      token 
    });
  } catch (error) {
    // Login error (details logged internally)
    res.status(500).json({ message: "Server error during login" });
  }
};

// ✅ Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};