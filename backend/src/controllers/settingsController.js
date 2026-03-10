import Settings from "../models/Settings.js";

// Get current system settings
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create defaults
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
    
    res.json({ settings });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

// Update system settings
const updateSettings = async (req, res) => {
  try {
    const {
      passwordMinLength,
      passwordRequireUppercase,
      passwordRequireNumbers,
      sessionTimeout,
      maxLoginAttempts,
      twoFactorEnabled,
      allowUserRegistration,
      allowMultipleSessions
    } = req.body;

    // Validate inputs
    if (passwordMinLength !== undefined) {
      if (passwordMinLength < 6 || passwordMinLength > 20) {
        return res.status(400).json({ 
          error: "Password length must be between 6 and 20" 
        });
      }
    }

    if (sessionTimeout !== undefined) {
      if (sessionTimeout < 5 || sessionTimeout > 480) {
        return res.status(400).json({ 
          error: "Session timeout must be between 5 and 480 minutes" 
        });
      }
    }

    if (maxLoginAttempts !== undefined) {
      if (maxLoginAttempts < 2 || maxLoginAttempts > 10) {
        return res.status(400).json({ 
          error: "Max login attempts must be between 2 and 10" 
        });
      }
    }

    // Find and update settings (or create if doesn't exist)
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      // Update only provided fields
      Object.assign(settings, req.body);
      await settings.save();
    }

    res.json({ 
      message: "Settings updated successfully", 
      settings 
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
};

// Reset settings to defaults
const resetSettings = async (req, res) => {
  try {
    await Settings.deleteMany({});
    
    const defaultSettings = await Settings.create({
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      twoFactorEnabled: false,
      allowUserRegistration: true,
      allowMultipleSessions: false
    });

    res.json({ 
      message: "Settings reset to defaults", 
      settings: defaultSettings 
    });
  } catch (error) {
    console.error("Reset settings error:", error);
    res.status(500).json({ error: "Failed to reset settings" });
  }
};

export default { getSettings, updateSettings, resetSettings };
