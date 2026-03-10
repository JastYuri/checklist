import connectDB from "../config/db.js";
import User from "../models/User.js";
import dotenv from "dotenv";

dotenv.config();

const promoteUserToAdmin = async (email) => {
  try {
    await connectDB();

    const user = await User.findOne({ email });

    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    user.role = "admin";
    await user.save();

    console.log(`✅ User "${user.username}" (${email}) has been promoted to admin!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error promoting user:", error);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log("Usage: node promoteAdmin.js <email>");
  console.log("Example: node promoteAdmin.js john@company.com");
  process.exit(1);
}

promoteUserToAdmin(email);
