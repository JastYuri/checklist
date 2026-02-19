import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { toRoman } from "../utils/roman"; // Assuming you have this for Roman numerals

const ReportPage = () => {
  const { id } = useParams(); // Check if we're viewing a single job
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleJob, setSingleJob] = useState(null);
  const [singleJobLoading, setSingleJobLoading] = useState(false);
  const [downloading, setDownloading] = useState(false); // Add this state at the top of the component

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
          const imageUrl = appearanceImages?.[side] ? `http://localhost:5000${appearanceImages[side]}` : null;
          
          return (
            <div key={side} className="card bg-base-200 shadow-md">
              <div className="card-body">
                <h5 className="card-title text-md capitalize">{side} Side</h5>
                <div className="relative">
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={`${side} view`}
                        className="w-full h-48 object-contain rounded"
                      />
                      {/* SVG Overlay for shapes - adjusted to scale with image */}
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        viewBox="0 0 1 1"
                        preserveAspectRatio="xMidYMid meet"
                        style={{ zIndex: 10 }}
                      >
                        {sideMarks.map((mark, idx) => {
                          // Assume 'circle' if type is missing or 'circle'
                          if (!mark.type || mark.type === 'circle') {
                            const cx = mark.x;
                            const cy = mark.y;
                            const r = 0.03;
                            return (
                              <circle
                                key={`shape-${idx}`}
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="none"
                                stroke="red"
                                strokeWidth="0.005"
                              />
                            );
                          } else if (mark.type === 'path' && Array.isArray(mark.path) && mark.path.length > 1) {
                            const d = `M ${mark.path[0].x} ${mark.path[0].y} L ${mark.path.slice(1).map(p => `${p.x} ${p.y}`).join(' L ')}`;
                            return (
                              <path
                                key={`shape-${idx}`}
                                d={d}
                                fill="none"
                                stroke="red"
                                strokeWidth="0.005"
                              />
                            );
                          }
                          return null;
                        })}
                      </svg>
                      {/* Overlay text beside the circle */}
                      {sideMarks.map((mark, idx) => (
                        <div
                          key={`text-${idx}`}
                          className="absolute text-red-500 font-bold text-sm"
                          style={{
                            left: `${mark.x * 100 + 5}%`, // Offset to the right of the circle
                            top: `${mark.y * 100}%`,
                            transform: 'translateY(-50%)', // Center vertically
                            zIndex: 20
                          }}
                        >
                          {mark.defectName?.split(' ')[0] || "Defect"}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="w-full h-48 bg-gray-300 rounded flex items-center justify-center">
                      <span className="text-gray-500">No {side} image</span>
                    </div>
                  )}
                </div>
                {/* Remarks */}
                {sideMarks.length > 0 && (
                  <div className="mt-2">
                    <h6 className="font-medium">Remarks:</h6>
                    {sideMarks.map((mark, idx) => (
                      mark.remarks && (
                        <p key={idx} className="text-sm text-gray-600">- {mark.defectName || "Defect"}: {mark.remarks}</p>
                      )
                    ))}
                  </div>
                )}
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
                        src={`http://localhost:5000${defect.image}`}
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner text-primary"></div>
      </div>
    );
    if (!singleJob) return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-error">Job Not Found</h2>
        <p className="mt-4">The requested job could not be found.</p>
        <Link to="/report" className="btn btn-primary mt-4">Back to Reports</Link>
      </div>
    );

    return (
      <div className="min-h-screen bg-base-200 p-4 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <Link to="/report" className="btn btn-sm btn-outline mb-6 inline-flex items-center">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job List
          </Link>
          
          <div className="card bg-base-100 shadow-xl mb-6">
            <div className="card-body">
              <h2 className="card-title text-3xl text-primary mb-4">
                Job Report: {singleJob.category?.name}
              </h2>

              {/* Job Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Customer</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.customer || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Model</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.model || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Body Type</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.bodyType || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Chassis No.</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.chassisNum || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Engine No.</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.engineNum || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Date</div>
                  <div className="stat-value text-lg">{formatDate(singleJob.jobInfo?.date)}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">JO No.</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.joNo || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">C/S No.</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.csNo || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Key No.</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.keyNumber || "N/A"}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg p-4">
                  <div className="stat-title">Job Type</div>
                  <div className="stat-value text-lg">{singleJob.jobInfo?.jobType || "N/A"}</div>
                </div>
              </div>

              {/* Legend */}
              <div className="alert alert-info mb-6">
                <div className="flex flex-wrap space-x-4 sm:space-x-6 text-sm">
                  <span className="flex items-center"><span className="text-lg mr-1">⭕</span> Good</span>
                  <span className="flex items-center"><span className="text-lg mr-1">❌</span> No Good</span>
                  <span className="flex items-center"><span className="text-lg mr-1">ⓧ</span> Corrected</span>
                  <span className="flex items-center"><span className="text-lg mr-1">🚫</span> N/A</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-secondary">Checklist</h3>
                {singleJob.checklist.map((section, sIdx) => (
                  <div key={section._id} className="card bg-base-200 shadow-md">
                    <div className="card-body">
                      <h4 className="card-title text-lg text-accent">{toRoman(sIdx + 1)}. {section.section}</h4>
                      <div className="space-y-2">
                        {renderItems(buildItemTree(section.items), 0, "")} {/* Start with empty prefix */}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Checklists for Viewing */}
              <div className="space-y-6 mt-8">
                {renderAppearanceChecklist(singleJob.appearanceMarks, singleJob.appearanceImages)}
                {renderSummaryChecklist(singleJob.defectSummary)}
                {renderTechnicalChecklist(singleJob.technicalTests)}
              </div>

              {/* Download PDF */}
              <div className="card-actions justify-end mt-6">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={() => handleDownloadPDF(singleJob._id, singleJob.category?.name)}
                  disabled={downloading} // Disable during download
                >
                  {downloading ? (
                    <>
                      <div className="loading loading-spinner loading-sm mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF Report
                    </>
                  )}
                </button>
              </div>
            </div>
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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div>
          <h1 className="text-5xl font-bold">No Jobs Available</h1>
          <p className="py-6">There are no job reports to display at the moment.</p>
          <Link to="/checklist" className="btn btn-primary">Create a Job</Link>
        </div>
      </div>
    </div>
  );

  console.log("🖥 Rendering ReportPage with jobs:", jobs.length);

  return (
    <div className="min-h-screen bg-base-200 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-3xl text-primary mb-6">Job Reports</h2>

            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr className="bg-base-300">
                    <th className="text-left">Date</th>
                    <th className="text-left">Customer</th>
                    <th className="text-left">Model</th>
                    <th className="text-left">Body Type</th>
                    <th className="text-left">Category</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job._id} className="hover:bg-base-200">
                      <td className="font-medium">{formatDate(job.jobInfo?.date)}</td>
                      <td>{job.jobInfo?.customer || "N/A"}</td>
                      <td>{job.jobInfo?.model || "N/A"}</td>
                      <td>{job.jobInfo?.bodyType || "N/A"}</td>
                      <td>
                        <span className="badge badge-primary">{job.category?.name}</span>
                      </td>
                      <td className="text-center">
                        <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <Link to={`/report/${job._id}`} className="btn btn-sm btn-outline btn-info">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </Link>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleDownloadPDF(job._id, job.category?.name)}
                            disabled={downloading} // Disable during any download
                          >
                            {downloading ? (
                              <>
                                <div className="loading loading-spinner loading-xs mr-1"></div>
                                ...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                PDF
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPage;