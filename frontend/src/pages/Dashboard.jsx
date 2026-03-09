// pages/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import toast from "react-hot-toast";
// Optional: Install recharts for dynamic charts (npm install recharts)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { FileText, Eye, Download, FolderOpen, CheckCircle, AlertTriangle, BookOpen, TrendingUp, Award, Zap, Target } from "lucide-react"; // ✅ Added icons for better UI

export default function Dashboard() {
  const [categories, setCategories] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [manuals, setManuals] = useState([]); // ✅ New: Fetch manuals for count and quick access
  const [currentYear] = useState(new Date().getFullYear()); // ✅ Filter to current year

  // Daily metrics
  const [jobsCreatedToday, setJobsCreatedToday] = useState(0);
  const [checklistsCompletedToday, setChecklistsCompletedToday] = useState(0);
  const [goodItemsPercentToday, setGoodItemsPercentToday] = useState(0);
  const [weeklyData, setWeeklyData] = useState([]); // For dynamic chart

  // Goals state - Fixed daily targets
  const [goals, setGoals] = useState({
    jobsPerDay: 5,        // Daily target: 5 jobs per day
    checklistsPerDay: 5,  // Daily target: 5 checklists per day
    accuracyGoal: 100,     // Target: 95% accuracy
    jobsThisMonth: 50,    // Target: 50 jobs this month
    manualsUploaded: 5,   // Target: 5 manuals uploaded
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

      // ✅ Filter jobs to current year only
      const currentYearJobs = allJobs.filter(job => {
        const jobYear = new Date(job.createdAt).getFullYear();
        return jobYear === currentYear;
      });

      setJobs(currentYearJobs);

      // ✅ Calculate today's metrics
      const today = new Date().toDateString();
      const todayJobs = currentYearJobs.filter(job => new Date(job.createdAt).toDateString() === today);
      setJobsCreatedToday(todayJobs.length);

      // Count checklists completed (jobs with checklist data) today
      setChecklistsCompletedToday(todayJobs.length);

      // Calculate good items percentage for today
      const todayItems = todayJobs
        .flatMap(job => job.checklist?.flatMap(section => section.items) || []);
      const todayGoodItems = todayItems.filter(item => item.status === 'good').length;
      const todayGoodPercent = todayItems.length > 0 ? (todayGoodItems / todayItems.length) * 100 : 0;
      setGoodItemsPercentToday(todayGoodPercent);

      // Calculate weekly data (last 7 days - current year only)
      const weekly = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayString = date.toDateString();
        const count = currentYearJobs.filter(job => new Date(job.createdAt).toDateString() === dayString).length;
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

  // ✅ Calculate goal progress (current year only)
  const jobsThisMonth = jobs.filter(job => {
    const jobDate = new Date(job.createdAt);
    const now = new Date();
    return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
  }).length;

  const totalItems = jobs.flatMap(job => job.checklist?.flatMap(section => section.items) || []).length;
  const goodItems = jobs.flatMap(job => job.checklist?.flatMap(section => section.items) || [])
    .filter(item => item.status === 'good').length;
  const accuracyRate = totalItems > 0 ? (goodItems / totalItems) * 100 : 0;

  // ✅ New: Calculate special checklist stats based on models (current year only)
  const jobsWithAppearanceMarks = jobs.filter(job => job.appearanceMarks && job.appearanceMarks.length > 0).length;
  const jobsWithDefectSummary = jobs.filter(job => job.defectSummary && job.defectSummary.length > 0).length;
  const jobsWithTechnicalTests = jobs.filter(job => job.technicalTests && Object.keys(job.technicalTests).length > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8"> {/* ✅ Responsive padding and spacing */}
      {/* ✅ Enhanced Header with Year */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-3xl md:text-4xl font-bold flex items-center">
          <CheckCircle className="mr-3 text-primary" size={32} /> Dashboard {currentYear}
        </h2>
        <div className="badge badge-lg badge-primary">Year: {currentYear}</div>
      </div>

      {/* ✅ ENHANCED Stats Section with Gradient Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
        {/* Categories Card */}
        <div className="card bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{categories.length}</div>
                <div className="text-sm opacity-90">Total Categories</div>
              </div>
              <FolderOpen size={48} className="opacity-30" />
            </div>
          </div>
        </div>

        {/* Total Jobs Card */}
        <div className="card bg-linear-to-br from-green-400 to-green-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{jobs.length}</div>
                <div className="text-sm opacity-90">Jobs ({currentYear})</div>
              </div>
              <Zap size={48} className="opacity-30" />
            </div>
          </div>
        </div>

        {/* Manuals Card */}
        <div className="card bg-linear-to-br from-purple-400 to-purple-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{manuals.length}</div>
                <div className="text-sm opacity-90">Manuals</div>
              </div>
              <BookOpen size={48} className="opacity-30" />
            </div>
          </div>
        </div>

        {/* Accuracy Rate Card */}
        <div className="card bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold">{accuracyRate.toFixed(0)}%</div>
                <div className="text-sm opacity-90">Quality Rate</div>
              </div>
              <Award size={48} className="opacity-30" />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Secondary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 md:mb-8">
        <div className="card bg-base-200 shadow-md p-4">
          <div className="flex items-center gap-3">
            <Target className="text-warning" size={24} />
            <div>
              <div className="text-sm opacity-75">Appearance Marks</div>
              <div className="text-2xl font-bold">{jobsWithAppearanceMarks}</div>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-md p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="text-error" size={24} />
            <div>
              <div className="text-sm opacity-75">Defect Reports</div>
              <div className="text-2xl font-bold">{jobsWithDefectSummary}</div>
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-md p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="text-secondary" size={24} />
            <div>
              <div className="text-sm opacity-75">Technical Tests</div>
              <div className="text-2xl font-bold">{jobsWithTechnicalTests}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED: Daily Metrics Section with Visualization */}
      <div className="card bg-base-100 shadow-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center">
          <CheckCircle className="mr-2 text-success" size={24} /> Today's Performance
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs Created Today - with Mini Chart */}
          <div className="card bg-linear-to-br from-base-200 to-base-300 p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-base">Jobs Created</h4>
                <p className="text-sm opacity-75">Today's Activity</p>
              </div>
              <Zap className="text-primary" size={24} />
            </div>
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: jobsCreatedToday },
                      { name: 'Remaining', value: Math.max(0, goals.jobsPerDay - jobsCreatedToday) }
                    ]}
                    cx="50%"
                    cy="50%"
                    backgroundColor="#f0f0f0"
                    innerRadius={35}
                    outerRadius={55}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{jobsCreatedToday}/{goals.jobsPerDay}</p>
              <progress 
                className="progress progress-primary w-full mt-3" 
                value={Math.min(jobsCreatedToday, goals.jobsPerDay)} 
                max={goals.jobsPerDay}
              ></progress>
              <p className="text-sm mt-2 opacity-75">{((jobsCreatedToday / goals.jobsPerDay) * 100).toFixed(0)}% Complete</p>
            </div>
          </div>

          {/* Checklists Completed Today */}
          <div className="card bg-linear-to-br from-base-200 to-base-300 p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-base">Checklists</h4>
                <p className="text-sm opacity-75">Completed Today</p>
              </div>
              <CheckCircle className="text-success" size={24} />
            </div>
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: checklistsCompletedToday },
                      { name: 'Remaining', value: Math.max(0, goals.checklistsPerDay - checklistsCompletedToday) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{checklistsCompletedToday}/{goals.checklistsPerDay}</p>
              <progress 
                className="progress progress-success w-full mt-3" 
                value={Math.min(checklistsCompletedToday, goals.checklistsPerDay)} 
                max={goals.checklistsPerDay}
              ></progress>
              <p className="text-sm mt-2 opacity-75">{((checklistsCompletedToday / goals.checklistsPerDay) * 100).toFixed(0)}% Complete</p>
            </div>
          </div>

          {/* Quality Score Today - with Explanation */}
          <div className="card bg-linear-to-br from-base-200 to-base-300 p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-semibold text-base">Quality Score</h4>
                <p className="text-sm opacity-75">Items Marked "Good"</p>
              </div>
              <Award className="text-warning" size={24} />
            </div>
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Good Items', value: Math.round(goodItemsPercentToday) },
                      { name: 'Other', value: Math.round(100 - goodItemsPercentToday) }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold">{goodItemsPercentToday.toFixed(1)}%</p>
              <progress 
                className="progress progress-warning w-full mt-3" 
                value={Math.min(goodItemsPercentToday, goals.accuracyGoal)} 
                max={goals.accuracyGoal}
              ></progress>
              <p className="text-sm mt-2 opacity-75">Target: {goals.accuracyGoal}%</p>
            </div>
          </div>
        </div>

        {/* ✅ Information Box: What Does Accuracy Mean? */}
        <div className="alert alert-info mt-6">
          <AlertTriangle size={20} />
          <div>
            <h3 className="font-semibold">What is Quality Score?</h3>
            <p className="text-sm">Quality Score measures the percentage of checklist items marked as "Good" (✓). This indicates how many vehicle inspection items passed without defects or issues. A higher percentage means better vehicle condition.</p>
          </div>
        </div>
      </div>

      {/* ✅ ENHANCED Monthly Goals Section */}
      <div className="card bg-base-100 shadow-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center">
          <Target className="mr-2 text-warning" size={24} /> Monthly Goals & Progress
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Jobs This Month - with Chart */}
          <div className="card bg-linear-to-br from-blue-50 to-blue-100 border-2 border-blue-200 p-4">
            <h4 className="font-semibold text-base mb-3">Jobs Completed This Month</h4>
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xl font-bold text-blue-600">{jobsThisMonth}</span>
              <span className="text-xl opacity-75">/ {goals.jobsThisMonth}</span>
            </div>
            <progress 
              className="progress progress-primary w-full mb-2" 
              value={(jobsThisMonth / goals.jobsThisMonth) * 100} 
              max="100"
            ></progress>
            <p className="text-sm font-semibold text-blue-700">
              {((jobsThisMonth / goals.jobsThisMonth) * 100).toFixed(1)}% Complete
            </p>
          </div>

          {/* Accuracy Rate - with Explanation */}
          <div className="card bg-linear-to-br from-orange-50 to-orange-100 border-2 border-orange-200 p-4">
            <h4 className="font-semibold text-base mb-3">Overall Accuracy Rate</h4>
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xl font-bold text-orange-600">{accuracyRate.toFixed(1)}%</span>
              <span className="text-xl opacity-75">/ {goals.accuracyGoal}%</span>
            </div>
            <progress 
              className="progress progress-warning w-full mb-2" 
              value={Math.min(accuracyRate, goals.accuracyGoal)} 
              max={goals.accuracyGoal}
            ></progress>
            <p className="text-sm font-semibold text-orange-700">
              {accuracyRate >= goals.accuracyGoal ? "✓ Goal met!" : "Keep improving!"}
            </p>
            <p className="text-xs mt-2 opacity-75">
              {totalItems} items checked, {goodItems} marked good
            </p>
          </div>

          {/* Manuals - Goal Tracking */}
          <div className="card bg-linear-to-br from-purple-50 to-purple-100 border-2 border-purple-200 p-4">
            <h4 className="font-semibold text-base mb-3">Manuals Uploaded</h4>
            <div className="flex justify-between items-center mb-3">
              <span className="text-3xl font-bold text-purple-600">{manuals.length}</span>
              <span className="text-xl opacity-75">/ {goals.manualsUploaded}</span>
            </div>
            <progress 
              className="progress progress-secondary w-full mb-2" 
              value={(manuals.length / goals.manualsUploaded) * 100} 
              max="100"
            ></progress>
            <p className="text-sm font-semibold text-purple-700">
              {((manuals.length / goals.manualsUploaded) * 100).toFixed(1)}% Complete
            </p>
          </div>
        </div>

        {/* ✅ Detailed Accuracy Explanation */}
        <div className="alert alert-warning mt-6">
          <AlertTriangle size={20} />
          <div>
            <h3 className="font-semibold">About Overall Accuracy Rate</h3>
            <p className="text-sm mt-1">This measures quality across <strong>all jobs for the entire year {currentYear}</strong>. It shows the percentage of inspection items marked as "Good" (no defects). For example: if you've inspected 500 items total and 475 were good, your accuracy is 95%. Target: {goals.accuracyGoal}% or higher.</p>
          </div>
        </div>
      </div>



      {/* ✅ ENHANCED Weekly Chart Section */}
      <div className="card bg-base-100 shadow-lg p-4 md:p-6">
        <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center">
          <TrendingUp className="mr-2 text-info" size={24} /> Weekly Performance Trend
        </h3>
        {weeklyData.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="border-2 border-base-300 rounded-lg p-4 bg-base-50">
              <h4 className="font-semibold text-sm mb-4">Daily Job Count</h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weeklyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f0f0f0' }} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div className="border-2 border-base-300 rounded-lg p-4 bg-base-50">
              <h4 className="font-semibold text-sm mb-4">Cumulative Trend</h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart 
                  data={weeklyData.map((item, idx) => ({
                    ...item,
                    cumulative: weeklyData.slice(0, idx + 1).reduce((sum, d) => sum + d.count, 0)
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f0f0f0' }} />
                  <Line type="monotone" dataKey="cumulative" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-sm md:text-base">Loading chart data...</p> 
        )}
      </div>

      {/* ✅ ENHANCED Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Link
          to="/checklist"
          className="card bg-linear-to-br from-emerald-400 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer" 
        >
          <div className="card-body">
            <h3 className="text-lg font-semibold flex items-center">
              <CheckCircle className="mr-2" size={20} /> Checklist
            </h3>
            <p className="text-sm opacity-90">View and select hierarchical categories for vehicle inspections.</p>
          </div>
        </Link>

        <Link
          to="/category"
          className="card bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer" 
        >
          <div className="card-body">
            <h3 className="text-lg font-semibold flex items-center">
              <FolderOpen className="mr-2" size={20} /> Categories
            </h3>
            <p className="text-sm opacity-90">Create and manage inspection categories.</p>
          </div>
        </Link>

        <Link
          to="/report" 
          className="card bg-linear-to-br from-violet-400 to-violet-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer" 
        >
          <div className="card-body">
            <h3 className="text-lg font-semibold flex items-center">
              <FileText className="mr-2" size={20} /> Reports
            </h3>
            <p className="text-sm opacity-90">View job reports and download PDFs.</p>
          </div>
        </Link>

        <Link
          to="/manual"
          className="card bg-linear-to-br from-amber-400 to-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
        >
          <div className="card-body">
            <h3 className="text-lg font-semibold flex items-center">
              <BookOpen className="mr-2" size={20} /> Manuals
            </h3>
            <p className="text-sm opacity-90">Upload and download reference manuals.</p>
          </div>
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
               <a href={`${manual.url}`} download={manual.name} className="btn btn-sm btn-secondary">
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