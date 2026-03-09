import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { toRoman } from "../utils/roman"; // Assuming you have this for Roman numerals
import { FileText, Download, Eye, TrendingUp, CheckCircle, AlertCircle, Zap } from "lucide-react";

const ReportPage = () => {
  const { id } = useParams(); // Check if we're viewing a single job
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleJob, setSingleJob] = useState(null);
  const [singleJobLoading, setSingleJobLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  // ✅ Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // Show 10 jobs per page
  const [searchTerm, setSearchTerm] = useState(""); // Search by customer/model
  const [selectedCategory, setSelectedCategory] = useState(""); // Filter by category
  const [dateFilter, setDateFilter] = useState(""); // Filter by date
  const [defectFilter, setDefectFilter] = useState("all"); // all, with-defects, no-defects

  useEffect(() => {
    if (id) {
      // Single job view
      const fetchSingleJob = async () => {
        setSingleJobLoading(true);
        try {
          const res = await axiosInstance.get(`/job/${id}`);
          setSingleJob(res.data);
        } catch (err) {
          console.error("Error fetching job:", err);
          setSingleJob(null);
        } finally {
          setSingleJobLoading(false);
        }
      };
      fetchSingleJob();
    } else {
      // Job list view
      const fetchJobs = async () => {
        console.log("📥 Fetching all jobs...");
        try {
          const res = await axiosInstance.get("/job");
          console.log("✅ Jobs data received:", res.data);

          // ✅ Sort jobs by latest date
          const sortedJobs = res.data.sort((a, b) =>
            new Date(b.jobInfo?.date) - new Date(a.jobInfo?.date)
          );

          setJobs(sortedJobs);
        } catch (err) {
          console.error("❌ Error fetching jobs:", err.response?.data || err.message);
        } finally {
          setLoading(false);
          console.log("⏹ Finished jobs fetch cycle");
        }
      };
      fetchJobs();
    }
  }, [id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }); // e.g. July 22, 2026
  };

  // ✅ Filter and search logic
  const getFilteredJobs = () => {
    return jobs.filter(job => {
      // Search by customer or model (case-insensitive)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (job.jobInfo?.customer?.toLowerCase().includes(searchLower)) ||
        (job.jobInfo?.model?.toLowerCase().includes(searchLower));

      // Filter by category
      const matchesCategory = !selectedCategory || 
        (job.category?._id === selectedCategory);

      // Filter by date
      const matchesDate = !dateFilter || 
        (new Date(job.jobInfo?.date).toDateString() === new Date(dateFilter).toDateString());

      // Filter by defect status
      const hasDefects = job.defectSummary?.length > 0;
      const matchesDefectFilter = 
        defectFilter === "all" || 
        (defectFilter === "with-defects" && hasDefects) ||
        (defectFilter === "no-defects" && !hasDefects);

      return matchesSearch && matchesCategory && matchesDate && matchesDefectFilter;
    });
  };

  const filteredJobs = getFilteredJobs();
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIdx, endIdx);

  // ✅ Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, dateFilter, defectFilter]);

  const handleDownloadPDF = async (jobId, categoryName) => {
    console.log("📥 Starting PDF download for job:", jobId);
    setDownloading(true); // Set loading state
    try {
      // Fetch job data for customer and date to build unique filename
      const jobRes = await axiosInstance.get(`/job/${jobId}`);
      const job = jobRes.data;
      const customer = job.jobInfo?.customer ? job.jobInfo.customer.replace(/[^a-zA-Z0-9\s]/g, "").trim() : "Unknown";
      const dateStr = job.jobInfo?.date ? new Date(job.jobInfo.date).toISOString().split("T")[0] : "NoDate";
      const filename = `${categoryName || "Checklist"}_${customer}_${dateStr}_Report.pdf`;

      // Now fetch the PDF
      const response = await axiosInstance.get(`/report/job/${jobId}`, {
        responseType: "blob",
      });

      if (!response.data || response.data.size === 0) {
        throw new Error("Received empty PDF data");
      }

      console.log("✅ PDF blob received, size:", response.data.size);

      // Create blob URL
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = filename; // Set unique filename in frontend
      a.style.display = "none"; // Hide the link
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Clean up
      window.URL.revokeObjectURL(url);

      console.log("📤 PDF download triggered successfully with filename:", filename);
    } catch (err) {
      console.error("❌ Error downloading PDF:", err.response?.data || err.message);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setDownloading(false); // Reset loading state
    }
  };

  // Function to build hierarchical tree from flat items using parentItem
  const buildItemTree = (items) => {
    const itemMap = {};
    const roots = [];

    items.forEach(item => {
      itemMap[item._id] = { ...item, children: [] };
    });

    items.forEach(item => {
      if (item.parentItem) {
        if (itemMap[item.parentItem]) {
          itemMap[item.parentItem].children.push(itemMap[item._id]);
        }
      } else {
        roots.push(itemMap[item._id]);
      }
    });

    return roots;
  };

  // ✅ Updated: Recursive function to render items with hierarchical numbering, filtering, and status-based remarks
  const renderItems = (items, indent = 0, prefix = "") => {
    // ✅ Filter: Hide input items with no value (same as wizard preview)
    const filteredItems = items.filter((item) => !(item.type === "input" && !item.value));
    
    return filteredItems.map((item, idx) => {
      const num = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
      // ✅ For input items, display as "Serial Number: [dynamic name]" to make it clear
      const cleanedName = item.type === "input" 
        ? `Serial Number: ${item.name.replace(/™/g, '').trim()}` 
        : item.name.replace(/™/g, '').trim();
      // Add dash for sub-items (indent > 0) to identify them without relying on indentation
      const subItemPrefix = indent > 0 ? "- " : "";
      const indentedDesc = '  '.repeat(indent) + subItemPrefix + `${num}. ${cleanedName}`;

      // Status emoji - ✅ Now applies to all items (input items have status too)
      const statusEmoji = item.status === 'good' ? '⭕' : item.status === 'noGood' ? '❌' : item.status === 'corrected' ? 'ⓧ' : '🚫';

      return (
        <div key={item._id} className="mb-3 p-3 bg-base-100 rounded-lg shadow-sm border" style={{ marginLeft: `${indent * 20}px` }}>
          <div className="flex justify-between items-center">
            <span className="font-medium text-base">{indentedDesc}</span>
            <span className="text-2xl">{statusEmoji}</span>
          </div>
          {/* ✅ Remarks: Show only for "noGood" or "corrected" status */}
          {(item.status === "noGood" || item.status === "corrected") && item.remarks && (
            <p className="text-sm text-gray-600 mt-2 ml-4 italic">Remarks: {item.remarks}</p>
          )}
          {item.children && item.children.length > 0 && (
            <div className="mt-3">
              {renderItems(item.children, indent + 1, num)} {/* Pass num as prefix for hierarchical numbering */}
            </div>
          )}
        </div>
      );
    });
  };
  
// Function to render appearance checklist for viewing
const renderAppearanceChecklist = (appearanceMarks, appearanceImages) => {
  const sides = ['front', 'rear', 'left', 'right'];
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold">Appearance Checklist</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sides.map(side => {
          const sideMarks = appearanceMarks?.filter(mark => mark.side === side) || [];
          const imageUrl = appearanceImages?.[side] || null;
          
          return (
            <div key={side} className="card bg-base-100 border border-base-300 shadow-md">
              <div className="card-body">
                <h5 className="card-title text-md capitalize mb-3">{side.charAt(0).toUpperCase() + side.slice(1)} Side</h5>
                
                {/* Image with SVG overlay - similar to ChecklistWizard preview */}
                <div className="relative w-full bg-base-200 rounded border border-base-300 overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={`${side} view`}
                        className="w-full h-full object-contain"
                      />
                      {/* SVG Overlay for shapes */}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 1 1"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ zIndex: 10 }}
                      >
                        {sideMarks.map((mark, idx) => {
                          if (!mark.type || mark.type === 'circle') {
                            const cx = mark.x;
                            const cy = mark.y;
                            const r = 0.03;
                            return (
                              <g key={`shape-${idx}`}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={r}
                                  fill="none"
                                  stroke="red"
                                  strokeWidth="0.005"
                                />
                                {/* Defect name label above circle */}
                                {mark.defectName && (
                                  <text
                                    x={cx + r + 0.02}
                                    y={cy - r - 0.02}
                                    fontSize="0.04"
                                    fill="red"
                                    fontWeight="bold"
                                    textAnchor="start"
                                  >
                                    {mark.defectName}
                                  </text>
                                )}
                              </g>
                            );
                          } else if (mark.type === 'path' && Array.isArray(mark.path) && mark.path.length > 1) {
                            const d = `M ${mark.path[0].x} ${mark.path[0].y} L ${mark.path.slice(1).map(p => `${p.x} ${p.y}`).join(' L ')}`;
                            return (
                              <g key={`shape-${idx}`}>
                                <path
                                  d={d}
                                  fill="none"
                                  stroke="red"
                                  strokeWidth="0.005"
                                />
                                {/* Defect name label at start of path */}
                                {mark.defectName && mark.path.length > 0 && (
                                  <text
                                    x={mark.path[0].x + 0.02}
                                    y={mark.path[0].y - 0.02}
                                    fontSize="0.04"
                                    fill="red"
                                    fontWeight="bold"
                                    textAnchor="start"
                                  >
                                    {mark.defectName}
                                  </text>
                                )}
                              </g>
                            );
                          }
                          return null;
                        })}
                      </svg>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-base-content/50">No {side} image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="alert alert-info shadow-md">
        <div className="text-base font-semibold">
          <strong>Defect Legend:</strong> C - Crack, SC - Scratch, D - Dent
        </div>
      </div>
    </div>
  );
};

  // Function to render summary checklist for viewing
  const renderSummaryChecklist = (defectSummary) => {
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Summary Checklist</h4>
        {/* Legends */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="alert alert-info">
            <div className="text-sm">
              <strong>Defect Code Legend:</strong><br />
              ■XX - Functional Defect/Defect Related to Safety/Defect Not Satisfying the Drawing/Defect Related to Regulations<br />
              ■X - Functional Defect Does Not Mentioned Above<br />
              □XX - Sensory/Appearance Defect Evaluation - Major<br />
              □X - Sensory/Appearance Defect Evaluation - Minor
            </div>
          </div>
          <div className="alert alert-warning">
            <div className="text-sm">
              <strong>Status Legend:</strong><br />
              ❌ No Good<br />
              ⓧ Corrected
            </div>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="text-center">No.</th>
                <th className="text-center">Defect Code</th>
                <th className="text-center">Defect Encountered</th>
                <th className="text-center">Status</th>
                <th className="text-center">Recurrence</th>
                <th className="text-center">Image</th>
              </tr>
            </thead>
            <tbody>
              {(defectSummary || []).map((defect, idx) => (
                <tr key={idx}>
                  <td className="text-center">{defect.no || (idx + 1)}</td>
                  <td className="text-center">
                    {defect.defectCode ? (
                      <span className={defect.defectCode.includes('XX') ? 'font-bold' : ''}>
                        {defect.defectCode.includes('functional') ? '■' : '□'}{defect.defectCode.includes('XX') ? 'XX' : 'X'}
                      </span>
                    ) : 'N/A'}
                  </td>
                  <td className="text-center">{defect.defectEncountered || 'N/A'}</td>
                  <td className="text-center">
                    {defect.status === 'noGood' ? '❌' : defect.status === 'corrected' ? 'ⓧ' : 'N/A'}
                  </td>
                  <td className="text-center">{defect.recurrence || 0}</td>
                  <td className="text-center">
                   {defect.image ? (
  <img
    src={defect.image}
    alt="Defect"
    className="w-12 h-12 object-cover rounded mx-auto"
  />
) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Function to render technical checklist for viewing
  const renderTechnicalChecklist = (technicalTests) => {
    const techData = technicalTests || {};
    return (
      <div className="space-y-4">
        <h4 className="text-lg font-semibold">Technical Checklist</h4>
        
        {/* I. Break Testing */}
        <div>
          <h5 className="font-semibold">I. Break Testing (Breaking Force daN)</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h6 className="font-medium">Maximum Breaking Force</h6>
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th>Front (Left)</th>
                    <th>Front (Right)</th>
                    <th>Sum</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Front</td>
                    <td>{techData.breakingForce?.max?.front?.left || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.front?.right || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.front?.sum || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.front?.difference || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Rear</td>
                    <td>{techData.breakingForce?.max?.rear?.left || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.rear?.right || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.rear?.sum || 'N/A'}</td>
                    <td>{techData.breakingForce?.max?.rear?.difference || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <h6 className="font-medium">Minimum Breaking Force</h6>
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th>Front (Left)</th>
                    <th>Front (Right)</th>
                    <th>Sum</th>
                    <th>Difference</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Front</td>
                    <td>{techData.breakingForce?.min?.front?.left || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.front?.right || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.front?.sum || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.front?.difference || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td>Rear</td>
                    <td>{techData.breakingForce?.min?.rear?.left || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.rear?.right || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.rear?.sum || 'N/A'}</td>
                    <td>{techData.breakingForce?.min?.rear?.difference || 'N/A'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* II. Speed Testing */}
        <div>
          <h5 className="font-semibold">II. Speed Testing</h5>
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Speedometer Reading</th>
                <th>Speed Tester Reading</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{techData.speedTesting?.speedometer || 'N/A'}</td>
                <td>{techData.speedTesting?.tester || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

                {/* III. Turning Radius */}
        <div>
          <h5 className="font-semibold">III. Turning Radius</h5>
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th></th>
                <th>Inner Tire</th>
                <th>Outer Tire</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Left Hand</td>
                <td>{techData.turningRadius?.inner?.left || 'N/A'}</td>
                <td>{techData.turningRadius?.outer?.left || 'N/A'}</td>
              </tr>
              <tr>
                <td>Right Hand</td>
                <td>{techData.turningRadius?.inner?.right || 'N/A'}</td>
                <td>{techData.turningRadius?.outer?.right || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* IV. Slip Tester */}
        <div>
          <h5 className="font-semibold">IV. Slip Tester</h5>
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Speed</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {(techData.slipTester || []).map((slip, idx) => (
                <tr key={idx}>
                  <td>{slip.speed || 'N/A'}</td>
                  <td>{slip.value || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* V. Headlight Tester */}
        <div>
          <h5 className="font-semibold">V. Headlight Tester</h5>
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th></th>
                <th>Low Beam (Before)</th>
                <th>Low Beam (After)</th>
                <th>High Beam (Before)</th>
                <th>High Beam (After)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Left Hand</td>
                <td>{techData.headlightTester?.lowBeam?.before?.left || 'N/A'}</td>
                <td>{techData.headlightTester?.lowBeam?.after?.left || 'N/A'}</td>
                <td>{techData.headlightTester?.highBeam?.before?.left || 'N/A'}</td>
                <td>{techData.headlightTester?.highBeam?.after?.left || 'N/A'}</td>
              </tr>
              <tr>
                <td>Right Hand</td>
                <td>{techData.headlightTester?.lowBeam?.before?.right || 'N/A'}</td>
                <td>{techData.headlightTester?.lowBeam?.after?.right || 'N/A'}</td>
                <td>{techData.headlightTester?.highBeam?.before?.right || 'N/A'}</td>
                <td>{techData.headlightTester?.highBeam?.after?.right || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* VI. ABS Testing */}
        <div>
          <h5 className="font-semibold">VI. ABS Testing (if equipped)</h5>
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Option</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {(techData.absTesting || []).map((abs, idx) => (
                <tr key={idx}>
                  <td>{abs.option || 'N/A'}</td>
                  <td>{abs.remarks || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (id) {
  // Single Job View
  if (singleJobLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-base-200">
      <div className="text-center">
        <div className="loading loading-spinner text-primary" style={{ width: '80px', height: '80px' }}></div>
        <p className="mt-4 text-gray-600 font-semibold">Loading job report...</p>
      </div>
    </div>
  );
  if (!singleJob) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body text-center">
          <AlertCircle className="mx-auto mb-4 text-error" size={64} />
          <h2 className="text-2xl font-bold text-error mb-2">Job Not Found</h2>
          <p className="text-gray-600 mb-6">The requested job report could not be found. It may have been deleted or the ID is incorrect.</p>
          <div className="card-actions justify-center gap-2">
            <Link to="/report" className="btn btn-primary gap-2">
              <FileText size={20} /> Back to Reports
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

    return (
      <div className="min-h-screen bg-base-200 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* ✅ Enhanced Single Job Header */}
          <div className="mb-8">
            <Link to="/report" className="btn btn-ghost gap-2 mb-4">
              <span>←</span> Back to Reports
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h1 className="text-4xl md:text-5xl font-bold flex items-center">
                <FileText className="mr-3 text-primary" size={40} /> Job Report
              </h1>
              <div className="badge badge-lg badge-primary font-bold">
                {singleJob.category?.name || "Uncategorized"}
              </div>
            </div>
          </div>

          {/* ✅ Job Info Cards - Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="card bg-linear-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Customer</h5>
                <p className="text-2xl font-bold text-gray-900">{singleJob.jobInfo?.customer || "N/A"}</p>
              </div>
            </div>

            <div className="card bg-linear-to-br from-green-50 to-green-100 border-l-4 border-green-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Model</h5>
                <p className="text-2xl font-bold text-gray-900">{singleJob.jobInfo?.model || "N/A"}</p>
              </div>
            </div>

            <div className="card bg-linear-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Body Type</h5>
                <p className="text-2xl font-bold text-gray-900">{singleJob.jobInfo?.bodyType || "N/A"}</p>
              </div>
            </div>

            <div className="card bg-linear-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Chassis Number</h5>
                <p className="text-lg font-bold font-mono text-gray-900">{singleJob.jobInfo?.chassisNum || "N/A"}</p>
              </div>
            </div>

            <div className="card bg-linear-to-br from-pink-50 to-pink-100 border-l-4 border-pink-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Engine Number</h5>
                <p className="text-lg font-bold font-mono text-gray-900">{singleJob.jobInfo?.engineNum || "N/A"}</p>
              </div>
            </div>

            <div className="card bg-linear-to-br from-cyan-50 to-cyan-100 border-l-4 border-cyan-500 shadow-md">
              <div className="card-body p-4">
                <h5 className="text-xs text-gray-600 font-semibold">Inspection Date</h5>
                <p className="text-2xl font-bold text-gray-900">{formatDate(singleJob.jobInfo?.date)}</p>
              </div>
            </div>
          </div>

          {/* Additional Job Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 p-4 bg-base-100 rounded-lg shadow-md">
            <div className="border-l-4 border-blue-400 pl-3">
              <div className="text-xs opacity-75 font-semibold">JO No.</div>
              <div className="text-lg font-bold">{singleJob.jobInfo?.joNo || "N/A"}</div>
            </div>
            <div className="border-l-4 border-green-400 pl-3">
              <div className="text-xs opacity-75 font-semibold">C/S No.</div>
              <div className="text-lg font-bold">{singleJob.jobInfo?.csNo || "N/A"}</div>
            </div>
            <div className="border-l-4 border-purple-400 pl-3">
              <div className="text-xs opacity-75 font-semibold">Key No.</div>
              <div className="text-lg font-bold">{singleJob.jobInfo?.keyNumber || "N/A"}</div>
            </div>
            <div className="border-l-4 border-orange-400 pl-3">
              <div className="text-xs opacity-75 font-semibold">Job Type</div>
              <div className="text-lg font-bold badge badge-outline">{singleJob.jobInfo?.jobType || "N/A"}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="alert alert-info mb-8 shadow-md">
            <AlertCircle size={20} />
            <div>
              <div className="font-semibold">Item Status Legend:</div>
              <div className="flex flex-wrap gap-4 mt-2 text-sm">
                <span className="flex items-center"><span className="text-lg mr-2">⭕</span> Good (No Issues)</span>
                <span className="flex items-center"><span className="text-lg mr-2">❌</span> No Good (Found Issues)</span>
                <span className="flex items-center"><span className="text-lg mr-2">ⓧ</span> Corrected (Fixed)</span>
                <span className="flex items-center"><span className="text-lg mr-2">🚫</span> N/A (Not Applicable)</span>
              </div>
            </div>
          </div>

          {/* Checklist Section */}
          <div className="space-y-6 mb-8">
            <h2 className="text-3xl font-bold flex items-center gap-2">
              <CheckCircle size={32} className="text-primary" /> Inspection Checklist
            </h2>
            {singleJob.checklist.map((section, sIdx) => (
              <div key={section._id} className="card bg-base-100 shadow-lg border-l-4 border-primary">
                <div className="card-body">
                  <h3 className="card-title text-xl text-primary mb-4 flex items-center gap-2">
                    <span className="badge badge-primary text-lg">{toRoman(sIdx + 1)}</span>
                    {section.section}
                  </h3>
                  <div className="space-y-3">
                    {renderItems(buildItemTree(section.items), 0, "")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Checklists for Viewing */}
          <div className="space-y-8 mb-8">
            {/* Appearance Checklist */}
            <div className="card bg-base-100 shadow-lg border-l-4 border-warning">
              <div className="card-body">
                {renderAppearanceChecklist(singleJob.appearanceMarks, singleJob.appearanceImages)}
              </div>
            </div>

            {/* Summary Checklist */}
            <div className="card bg-base-100 shadow-lg border-l-4 border-error">
              <div className="card-body">
                {renderSummaryChecklist(singleJob.defectSummary)}
              </div>
            </div>

            {/* Technical Checklist */}
            <div className="card bg-base-100 shadow-lg border-l-4 border-secondary">
              <div className="card-body">
                {renderTechnicalChecklist(singleJob.technicalTests)}
              </div>
            </div>
          </div>

          {/* Download PDF Button */}
          <div className="flex justify-center gap-4">
            <button
              className="btn btn-primary btn-lg gap-2"
              onClick={() => handleDownloadPDF(singleJob._id, singleJob.category?.name)}
              disabled={downloading}
            >
              {downloading ? (
                <>
                  <div className="loading loading-spinner loading-sm"></div>
                  Downloading...
                </>
              ) : (
                <>
                  <Download size={20} /> Download PDF Report
                </>
              )}
            </button>
            <Link to="/report" className="btn btn-ghost btn-lg gap-2">
              Back to Reports
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Job List View
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="loading loading-spinner text-primary"></div>
    </div>
  );

  if (!jobs.length) return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl max-w-md w-full">
        <div className="card-body text-center">
          <AlertCircle className="mx-auto mb-4 text-warning" size={64} />
          <h1 className="text-3xl font-bold mb-2">No Jobs Available</h1>
          <p className="text-gray-600 mb-6">There are no job reports to display at the moment. Create a new inspection to get started.</p>
          <div className="card-actions justify-center gap-2">
            <Link to="/checklist" className="btn btn-primary gap-2">
              <CheckCircle size={20} /> Create a Job
            </Link>
            <Link to="/" className="btn btn-ghost gap-2">
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  console.log("🖥 Rendering ReportPage with jobs:", jobs.length);

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* ✅ Enhanced Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <h1 className="text-4xl md:text-5xl font-bold flex items-center">
              <FileText className="mr-3 text-primary" size={40} /> Job Reports
            </h1>
            <div className="badge badge-lg badge-primary">Total: {filteredJobs.length} of {jobs.length} Jobs</div>
          </div>
          
          {/* Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="card bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-lg">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">{filteredJobs.length}</div>
                    <div className="text-sm opacity-90">Filtered Results</div>
                  </div>
                  <Zap size={48} className="opacity-30" />
                </div>
              </div>
            </div>

            <div className="card bg-linear-to-br from-green-400 to-green-600 text-white shadow-lg">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">
                      {filteredJobs.filter(j => j.defectSummary?.length > 0).length}
                    </div>
                    <div className="text-sm opacity-90">With Defects</div>
                  </div>
                  <AlertCircle size={48} className="opacity-30" />
                </div>
              </div>
            </div>

            <div className="card bg-linear-to-br from-purple-400 to-purple-600 text-white shadow-lg">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-4xl font-bold">
                      {filteredJobs.filter(j => j.appearanceMarks?.length > 0).length}
                    </div>
                    <div className="text-sm opacity-90">Appearance Marked</div>
                  </div>
                  <CheckCircle size={48} className="opacity-30" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Search & Filter Controls */}
        <div className="card bg-base-100 shadow-lg mb-6">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">🔍 Search & Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search by Customer/Model */}
              <div className="form-control">
                <label className="label text-sm font-semibold">
                  <span className="label-text">Search (Customer/Model)</span>
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>

              {/* Filter by Category */}
              <div className="form-control">
                <label className="label text-sm font-semibold">
                  <span className="label-text">Category</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="">All Categories</option>
                  {[...new Set(jobs.map(j => JSON.stringify({id: j.category?._id, name: j.category?.name})))].map(cat => {
                    const {id, name} = JSON.parse(cat);
                    return id ? <option key={id} value={id}>{name}</option> : null;
                  })}
                </select>
              </div>

              {/* Filter by Date */}
              <div className="form-control">
                <label className="label text-sm font-semibold">
                  <span className="label-text">Date</span>
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </div>

              {/* Filter by Defect Status */}
              <div className="form-control">
                <label className="label text-sm font-semibold">
                  <span className="label-text">Defect Status</span>
                </label>
                <select
                  value={defectFilter}
                  onChange={(e) => setDefectFilter(e.target.value)}
                  className="select select-bordered select-sm"
                >
                  <option value="all">All Jobs</option>
                  <option value="with-defects">With Defects</option>
                  <option value="no-defects">No Defects</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              <div className="form-control flex justify-end">
                <label className="label text-sm font-semibold">
                  <span className="label-text">&nbsp;</span>
                </label>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("");
                    setDateFilter("");
                    setDefectFilter("all");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Enhanced Table Section with Pagination */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-6">
            <h2 className="card-title text-2xl text-primary mb-6 flex items-center">
              <TrendingUp className="mr-2" size={28} /> Job Listing
            </h2>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-300">
                    <th className="text-left">Date</th>
                    <th className="text-left">Customer</th>
                    <th className="text-left">Model</th>
                    <th className="text-left">Body Type</th>
                    <th className="text-left">Category</th>
                    <th className="text-center">Defects</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedJobs.map(job => (
                    <tr key={job._id} className="hover:bg-base-200 transition">
                      <td className="font-medium">{formatDate(job.jobInfo?.date)}</td>
                      <td>
                        <span className="font-semibold">{job.jobInfo?.customer || "N/A"}</span>
                      </td>
                      <td>{job.jobInfo?.model || "N/A"}</td>
                      <td>
                        <span className="badge badge-outline">{job.jobInfo?.bodyType || "N/A"}</span>
                      </td>
                      <td>
                        <span className="badge badge-primary font-semibold">{job.category?.name || "Uncategorized"}</span>
                      </td>
                      <td className="text-center">
                        {job.defectSummary?.length > 0 ? (
                          <span className="badge badge-warning gap-2">
                            {job.defectSummary.length}
                          </span>
                        ) : (
                          <span className="badge badge-success">✓ None</span>
                        )}
                      </td>
                      <td className="text-center">
                        <div className="flex flex-col sm:flex-row justify-center gap-2">
                          <Link 
                            to={`/report/${job._id}`} 
                            className="btn btn-sm btn-info gap-1 text-white"
                            title="View Report"
                          >
                            <Eye size={16} /> View
                          </Link>
                          <button
                            className="btn btn-sm btn-primary gap-1"
                            onClick={() => handleDownloadPDF(job._id, job.category?.name)}
                            disabled={downloading}
                            title="Download PDF"
                          >
                            {downloading ? (
                              <>
                                <div className="loading loading-spinner loading-xs"></div>
                              </>
                            ) : (
                              <>
                                <Download size={16} /> PDF
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ✅ No results message */}
            {paginatedJobs.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle size={48} className="mx-auto mb-3 text-warning opacity-50" />
                <p className="text-base-content/70 font-semibold">No jobs match your filters</p>
                <p className="text-base-content/50 text-sm">Try adjusting your search criteria</p>
              </div>
            )}

            {/* ✅ Pagination Controls */}
            {filteredJobs.length > 0 && (
              <div className="join grid grid-cols-2 md:grid-cols-5 gap-2 mt-6 pt-6 border-t border-base-300">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="join-item btn btn-sm"
                >
                  « Previous
                </button>

                {/* Page Numbers */}
                <div className="join-item btn btn-sm btn-disabled md:col-span-2">
                  Page {currentPage} of {totalPages}
                </div>

                {/* Results Info */}
                <div className="join-item btn btn-sm btn-disabled md:col-span-2">
                  Showing {startIdx + 1}-{Math.min(endIdx, filteredJobs.length)} of {filteredJobs.length}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="join-item btn btn-sm"
                >
                  Next »
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;