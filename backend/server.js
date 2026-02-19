import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import checklistRoutes from "./src/routes/checklistRoutes.js";
import categoryRoutes from "./src/routes/categoryRoutes.js";
import jobRoutes from "./src/routes/jobRoutes.js";
import reportRoutes from "./src/routes/reportRoutes.js";
import manualRoutes from "./src/routes/manual.js";
import path from "path";



dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
// Routes
app.use("/api/auth", authRoutes);
app.use("/api/checklist", checklistRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/job", jobRoutes); 
app.use("/api/report", reportRoutes);
app.use("/api/manual", manualRoutes);

// Serve static files from React build (for production)
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all handler for React routing (must be last)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));