import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    passwordMinLength: {
      type: Number,
      default: 8,
      min: 6,
      max: 20
    },
    passwordRequireUppercase: {
      type: Boolean,
      default: true
    },
    passwordRequireNumbers: {
      type: Boolean,
      default: true
    },
    sessionTimeout: {
      type: Number,
      default: 30,
      min: 5,
      max: 480
    },
    maxLoginAttempts: {
      type: Number,
      default: 5,
      min: 2,
      max: 10
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    allowUserRegistration: {
      type: Boolean,
      default: true
    },
    allowMultipleSessions: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    collection: "system_settings"
  }
);

export default mongoose.model("Settings", SettingsSchema);
