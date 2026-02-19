// pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
// Optional: Install recharts for dynamic charts (npm install recharts)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Eye, Download, FolderOpen, CheckCircle, AlertTriangle, BookOpen } from "lucide-react"; // ✅ Added icons for better UI

export default function Dashboard() {
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [manuals, setManuals] = useState([]); // ✅ New: Fetch manuals for count and quick access
  const [checklistDoneToday, setChecklistDoneToday] = useState(0);
  const [totalChecklist, setTotalChecklist] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]); // For dynamic chart

  // Goals state (dynamic targets based on data; replace with API fetch later)
  const [goals, setGoals] = useState({
    jobsThisMonth: 50, // Target: 50 jobs this month
    accuracyRate: 95,  // Target: 95% accuracy
    manualsUploaded: 5, // Target: 5 manuals uploaded
  });

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get("/category");
      setCategories(res.data);
    } catch (error) {
      toast.error("Failed to fetch categories");
    }
  };

  const fetchJobs = async () => {
    try {
      const res = await axiosInstance.get("/job");
      const allJobs = res.data;
      setJobs(allJobs);
      setTotalChecklist(allJobs.length);

      // Calculate jobs done today (assuming "done" means created today; adjust if you have a completion field)
      const today = new Date().toDateString();
      const doneToday = allJobs.filter(job => new Date(job.createdAt).toDateString() === today).length;
      setChecklistDoneToday(doneToday);

      // Calculate weekly data (last 7 days)
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.toDateString();
        const count = allJobs.filter(job => new Date(job.createdAt).toDateString() === day).length;
        weekly.push({ day: date.toLocaleDateString("en-US", { weekday: "short" }), count });
      }
      setWeeklyData(weekly);
    } catch (error) {
      toast.error("Failed to fetch jobs");
    }
  };

  const fetchManuals = async () => {
    try {
      const res = await axiosInstance.get("/manual");
      setManuals(res.data.manuals || []);
    } catch (error) {
      toast.error("Failed to fetch manuals");
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchJobs();
    fetchManuals(); // ✅ Fetch manuals on load
  }, []);

  // Calculate goal progress
  const jobsThisMonth = jobs.filter(job => {
    const jobDate = new Date(job.createdAt);
    const now = new Date();
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
  }).length;

  const totalItems = jobs.flatMap(job => job.checklist.flatMap(section => section.items)).length;
  const goodItems = jobs.flatMap(job => job.checklist.flatMap(section => section.items))
    .filter(item => item.status === 'good').length;
  const accuracyRate = totalItems > 0 ? (goodItems / totalItems) * 100 : 0;

  // ✅ New: Calculate special checklist stats based on models
  const jobsWithAppearanceMarks = jobs.filter(job => job.appearanceMarks && job.appearanceMarks.length > 0).length;
  const jobsWithDefectSummary = jobs.filter(job => job.defectSummary && job.defectSummary.length > 0).length;
  const jobsWithTechnicalTests = jobs.filter(job => job.technicalTests && Object.keys(job.technicalTests).length > 0).length;

  const progressPercent = totalChecklist > 0 ? Math.round((checklistDoneToday / totalChecklist) * 100) : 0;

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8"> {/* ✅ Responsive padding and spacing */}
      <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 flex items-center">
        <CheckCircle className="mr-2 text-primary" size={24} /> Dashboard
      </h2> {/* ✅ Added icon and responsive text size */}

      {/* Stats Section - Enhanced with model-based data */}
      <div className="stats shadow w-full mb-6 md:mb-8 overflow-x-auto"> {/* ✅ Added overflow for small screens */}
        <div className="stat">
          <div className="stat-title">Categories</div>
          <div className="stat-value">{categories.length}</div>
          <div className="stat-desc">Total categories created</div>
        </div>

        <div className="stat">
          <div className="stat-title">Jobs Completed Today</div>
          <div className="stat-value text-success">{checklistDoneToday}</div>
          <div className="stat-desc">Out of {totalChecklist} total jobs</div>
        </div>

        <div className="stat">
          <div className="stat-title">Completion Rate</div>
          <div className="stat-value text-primary">{progressPercent}%</div>
          <div className="stat-desc">Daily progress</div>
        </div>

        <div className="stat">
          <div className="stat-title">Manuals Uploaded</div>
          <div className="stat-value text-info">{manuals.length}</div>
          <div className="stat-desc">Available for reference</div>
        </div>

        {/* ✅ New: Special Checklist Stats */}
        <div className="stat">
          <div className="stat-title">Jobs with Appearance Marks</div>
          <div className="stat-value text-warning">{jobsWithAppearanceMarks}</div>
          <div className="stat-desc">Defects marked on vehicle sides</div>
        </div>

        <div className="stat">
          <div className="stat-title">Jobs with Defect Summaries</div>
          <div className="stat-value text-error">{jobsWithDefectSummary}</div>
          <div className="stat-desc">Detailed defect reports</div>
        </div>

        <div className="stat">
          <div className="stat-title">Jobs with Technical Tests</div>
          <div className="stat-value text-secondary">{jobsWithTechnicalTests}</div>
          <div className="stat-desc">Breaking force, speed, etc.</div>
        </div>
      </div>

      {/* Goals Section - Enhanced */}
      <div className="card bg-base-100 shadow-md p-4 md:p-6"> {/* ✅ Responsive padding */}
        <h3 className="text-lg md:text-xl font-semibold mb-4 flex items-center">
          <AlertTriangle className="mr-2 text-warning" size={20} /> Goals
        </h3> {/* ✅ Added icon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"> {/* ✅ Added lg breakpoint */}
          <div className="card bg-base-200 p-4">
            <h4 className="font-semibold text-sm md:text-base">Jobs Completed This Month</h4> {/* ✅ Responsive text */}
            <p className="text-sm md:text-base">{jobsThisMonth} / {goals.jobsThisMonth}</p> {/* ✅ Responsive text */}
            <progress 
              className="progress progress-primary w-full mt-2" 
              value={(jobsThisMonth / goals.jobsThisMonth) * 100} 
              max="100"
            ></progress>
            <p className="text-xs md:text-sm mt-2"> {/* ✅ Responsive text */}
              {((jobsThisMonth / goals.jobsThisMonth) * 100).toFixed(1)}% complete
            </p>
          </div>
          <div className="card bg-base-200 p-4">
            <h4 className="font-semibold text-sm md:text-base">Checklist Accuracy Rate</h4> {/* ✅ Responsive text */}
            <p className="text-sm md:text-base">{accuracyRate.toFixed(1)}% / {goals.accuracyRate}%</p> {/* ✅ Responsive text */}
            <progress 
              className="progress progress-success w-full mt-2" 
              value={Math.min(accuracyRate, goals.accuracyRate)} 
              max={goals.accuracyRate}
            ></progress>
            <p className="text-xs md:text-sm mt-2"> {/* ✅ Responsive text */}
              {accuracyRate >= goals.accuracyRate ? "Goal met! 🎉" : "Keep going!"}
            </p>
          </div>
          <div className="card bg-base-200 p-4">
            <h4 className="font-semibold text-sm md:text-base">Manuals Uploaded</h4> {/* ✅ New goal */}
            <p className="text-sm md:text-base">{manuals.length} / {goals.manualsUploaded}</p>
            <progress 
              className="progress progress-info w-full mt-2" 
              value={(manuals.length / goals.manualsUploaded) * 100} 
              max="100"
            ></progress>
            <p className="text-xs md:text-sm mt-2">
              {((manuals.length / goals.manualsUploaded) * 100).toFixed(1)}% complete
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card bg-base-100 shadow-md p-4 md:p-6"> {/* ✅ Responsive padding */}
        <h3 className="text-lg md:text-xl font-semibold mb-4">Daily Checklist Progress</h3> {/* ✅ Responsive text */}
        <progress
          className="progress progress-primary w-full"
          value={progressPercent}
          max="100"
        ></progress>
        <p className="mt-2 text-xs md:text-sm text-gray-500"> {/* ✅ Responsive text */}
          {checklistDoneToday} of {totalChecklist} tasks completed today
        </p>
      </div>

      {/* Weekly Chart - Now Dynamic */}
      <div className="card bg-base-100 shadow-md p-4 md:p-6"> {/* ✅ Responsive padding */}
        <h3 className="text-lg md:text-xl font-semibold mb-4">Weekly Checklist Completion</h3> {/* ✅ Responsive text */}
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250} minHeight={200}> {/* ✅ Added minHeight for small screens */}
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} /> {/* ✅ Smaller font on small screens */}
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm md:text-base">Loading chart...</p> 
        )}
      </div>

      {/* Navigation Cards - Enhanced with icons and manuals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8"> {/* ✅ Added lg breakpoint and manuals card */}
        <Link
          to="/checklist"
          className="card bg-base-200 shadow-md p-4 md:p-6 hover:bg-base-300 cursor-pointer transition" 
        >
          <h3 className="text-lg md:text-xl font-semibold mb-2 flex items-center">
            <CheckCircle className="mr-2 text-success" size={20} /> Checklist
          </h3> {/* ✅ Added icon */}
          <p className="text-sm md:text-base">View and select hierarchical categories for inspections.</p> {/* ✅ Responsive text */}
        </Link>

        <Link
          to="/category"
          className="card bg-base-200 shadow-md p-4 md:p-6 hover:bg-base-300 cursor-pointer transition" 
        >
          <h3 className="text-lg md:text-xl font-semibold mb-2 flex items-center">
            <FolderOpen className="mr-2 text-primary" size={20} /> Category Management
          </h3> {/* ✅ Added icon */}
          <p className="text-sm md:text-base">Create and manage categories that appear in the checklist.</p> {/* ✅ Responsive text */}
        </Link>

        <Link
          to="/report" 
          className="card bg-base-200 shadow-md p-4 md:p-6 hover:bg-base-300 cursor-pointer transition" 
        >
          <h3 className="text-lg md:text-xl font-semibold mb-2 flex items-center">
            <FileText className="mr-2 text-secondary" size={20} /> Reports
          </h3> {/* ✅ Added icon */}
          <p className="text-sm md:text-base">View job reports and download PDFs.</p> {/* ✅ Responsive text */}
        </Link>

        <Link
          to="/manual"
          className="card bg-base-200 shadow-md p-4 md:p-6 hover:bg-base-300 cursor-pointer transition"
        >
          <h3 className="text-lg md:text-xl font-semibold mb-2 flex items-center">
            <BookOpen className="mr-2 text-info" size={20} /> Manuals
          </h3> {/* ✅ New card for manuals */}
          <p className="text-sm md:text-base">Upload, view, and download reference manuals.</p>
        </Link>
      </div>

      {/* Quick Category Overview - Enhanced */}
      <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-4 flex items-center">
        <FolderOpen className="mr-2 text-primary" size={20} /> Quick Category Overview
      </h3> {/* ✅ Added icon */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"> {/* ✅ Added more breakpoints for larger screens */}
          {categories.map((cat) => (
            <div key={cat._id} className="card bg-base-100 shadow p-4">
              <h4 className="font-bold text-sm md:text-base">{cat.name}</h4> {/* ✅ Responsive text */}
              <p className="text-xs md:text-sm text-gray-600"> {/* ✅ Responsive text */}
                {cat.description || "No description"}
              </p>
              <p className="text-xs mt-2 text-gray-400">
                {cat.children?.length || 0} subcategories | {cat.checklist?.length || 0} sections
              </p> {/* ✅ Added sections count from model */}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm md:text-base text-gray-500"> {/* ✅ Responsive text */}
          No categories yet. Add some in Category Management.
        </p>
      )}

      {/* ✅ New: Quick Manuals Overview */}
      <h3 className="text-lg md:text-xl font-semibold mb-2 md:mb-4 flex items-center">
        <BookOpen className="mr-2 text-info" size={20} /> Quick Manuals Overview
      </h3>
      {manuals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuals.slice(0, 6).map((manual) => ( // Show first 6 for overview
            <div key={manual.id} className="card bg-base-100 shadow p-4">
              <h4 className="font-bold text-sm md:text-base">{manual.name}</h4>
              <p className="text-xs md:text-sm text-gray-600">
                Uploaded: {new Date(manual.uploadedAt).toLocaleDateString()}
              </p>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-sm btn-primary">
                  <Eye size={14} className="mr-1" /> View
                </button>
                <a href={`http://localhost:5000${manual.url}`} download={manual.name} className="btn btn-sm btn-secondary">
                  <Download size={14} className="mr-1" /> Download
                </a>
              </div>
            </div>
          ))}
          {manuals.length > 6 && (
            <Link to="/manual" className="card bg-base-200 shadow p-4 flex items-center justify-center">
              <span className="text-sm md:text-base">View All Manuals</span>
            </Link>
          )}
        </div>
      ) : (
        <p className="text-sm md:text-base text-gray-500">
          No manuals yet. Upload some in Manuals.
        </p>
      )}
    </div>
  );
}