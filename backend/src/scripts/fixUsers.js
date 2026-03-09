import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const fixUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // ✅ Find all users without password
    const usersWithoutPassword = await User.find({ password: { $exists: false, $ne: null } });
    
    if (usersWithoutPassword.length === 0) {
      console.log("All users have passwords!");
      return;
    }

    console.log(`Found ${usersWithoutPassword.length} users without passwords`);

    // ✅ Generate a default password for each user
    for (const user of usersWithoutPassword) {
      const defaultPassword = "TempPass123";
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);
      
      user.password = hashedPassword;
      await user.save();
      
      console.log(`Fixed user: ${user.email} (password: ${defaultPassword})`);
    }

    console.log("All users fixed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error fixing users:", error);
    process.exit(1);
  }
};

fixUsers();

