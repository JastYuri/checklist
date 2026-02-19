import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";

// ✅ Add API_BASE_URL (adjust if needed; matches your Category component)
const API_BASE_URL = 'http://localhost:5000';



// ✅ Import special checklists
import AppearanceChecklist from "./appearanceChecklist";
import SummaryChecklist from "./summaryChecklist";
import TechnicalChecklist from "./technicalChecklist";

// ✅ Helper component for canvas preview in modal (updated for better sizing)
const AppearancePreviewCanvas = ({ side, marks, imageSrc }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const redrawCanvas = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Debug: Log canvas size and marks
      console.log(`Canvas size for ${side}:`, canvas.width, canvas.height);
      console.log(`Marks for ${side}:`, marks);
      // Draw permanent marks (adapted from AppearanceChecklist)
      marks.forEach((mark) => {
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        if (mark.type === 'circle') {
          ctx.beginPath();
          ctx.arc(mark.x * canvas.width, mark.y * canvas.height, mark.radius * Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
          ctx.stroke();
          // Add label if defectName exists
          if (mark.defectName) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(mark.defectName, mark.x * canvas.width + mark.radius * Math.min(canvas.width, canvas.height) + 5, mark.y * canvas.height - 5);
          }
        } else if (mark.type === 'path') {
          ctx.beginPath();
          mark.path.forEach((point, i) => {
            const px = point.x * canvas.width;
            const py = point.y * canvas.height;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          // Add label at start of path if defectName exists
          if (mark.defectName && mark.path.length > 0) {
            ctx.fillStyle = 'red';
            ctx.font = '16px Arial';
            ctx.fillText(mark.defectName, mark.path[0].x * canvas.width + 5, mark.path[0].y * canvas.height - 5);
          }
        }
      });
    };

    const updateCanvasSize = () => {
      // Use clientWidth/Height for displayed size (more accurate for constrained images)
      const width = img.clientWidth;
      const height = img.clientHeight;
      canvas.width = width;
      canvas.height = height;
      console.log(`Image displayed size for ${side}:`, width, height); // Debug
      redrawCanvas();
    };

    img.addEventListener('load', updateCanvasSize);
    if (img.complete) updateCanvasSize(); // If already loaded
    window.addEventListener('resize', updateCanvasSize); // Handle resize

    return () => {
      img.removeEventListener('load', updateCanvasSize);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [marks, imageSrc, side]); // Include side for logging

  return (
    <div key={side}>
      <h5 className="font-semibold capitalize mb-2">{side} Side</h5>
      <div className="relative mb-4">
        <img
          ref={imgRef}
          src={imageSrc}
          alt={`${side} side`}
          className="w-full h-auto object-contain rounded border" // ✅ Removed max-h-96 to match edit mode sizing
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none" // Overlay, no interaction
        />
      </div>
      {/* Improved list of defects (unchanged) */}
      <div className="space-y-4">
        {marks.map((mark, idx) => (
          <div key={idx} className="bg-base-100 p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-base-content">Defect {idx + 1} ({mark.type})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-base-content/80">Defect Name:</span>
                <p className="text-sm text-base-content mt-1">{mark.defectName || "N/A"}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-base-content/80">Remarks:</span>
                <p className="text-sm text-base-content mt-1">{mark.remarks || "No remarks"}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChecklistWizard = ({
  job,
  checklist,
  onChange,
  // ✅ Removed old onSave; added onSaveAll for saving everything at the end
  onSaveAll,
  // ✅ New props for special checklists (no incremental saves)
  appearanceData,
  summaryData,
  technicalData,
  appearanceImages // ✅ New: Appearance images from category
}) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // ✅ New states for image preview
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  // ✅ New state for special checklist step (0 = normal, 1 = appearance, 2 = summary, 3 = technical)
  const [specialStep, setSpecialStep] = useState(0);
  // ✅ States for special checklist data (local copies with job-specific localStorage persistence)
  const [localAppearanceData, setLocalAppearanceData] = useState(() => {
    const saved = localStorage.getItem(`appearanceData-${job?._id}`);
    return saved ? JSON.parse(saved) : (appearanceData || []);
  });
  const [localSummaryData, setLocalSummaryData] = useState(() => {
    const saved = localStorage.getItem(`summaryData-${job?._id}`);
    return saved ? JSON.parse(saved) : (summaryData || []);
  });
  const [localTechnicalData, setLocalTechnicalData] = useState(() => {
    const saved = localStorage.getItem(`technicalData-${job?._id}`);
    return saved ? JSON.parse(saved) : (technicalData || {});
  });

  // ✅ Persist special data to job-specific localStorage on change
  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`appearanceData-${job._id}`, JSON.stringify(localAppearanceData));
    }
  }, [localAppearanceData, job?._id]);

  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`summaryData-${job._id}`, JSON.stringify(localSummaryData));
    }
  }, [localSummaryData, job?._id]);

  useEffect(() => {
    if (job?._id) {
      localStorage.setItem(`technicalData-${job._id}`, JSON.stringify(localTechnicalData));
    }
  }, [localTechnicalData, job?._id]);

  // ✅ Clear job-specific localStorage when job changes
  useEffect(() => {
    if (job?._id) {
      // Clear previous job's data if any
      const keys = Object.keys(localStorage).filter(key => key.startsWith('appearanceData-') || key.startsWith('summaryData-') || key.startsWith('technicalData-'));
      keys.forEach(key => {
        if (!key.includes(job._id)) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [job?._id]);

  // ✅ Clear localStorage on final save
  const clearLocalStorage = () => {
    if (job?._id) {
      localStorage.removeItem(`appearanceData-${job._id}`);
      localStorage.removeItem(`summaryData-${job._id}`);
      localStorage.removeItem(`technicalData-${job._id}`);
    }
  };

  useEffect(() => {
    if (currentSection >= checklist.length) {
      setCurrentSection(0);
    }
  }, [checklist]);

  // Update status (preserves parentItem and code)
  const updateStatus = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((itm, idx) =>
        idx === itemIdx
          ? {
              ...itm,
              status: value,
              remarks: value === "good" || value === "na" ? "" : itm.remarks,
            }
          : itm
      ),
    };
    onChange(updated);
  };

  // Update remarks (preserves parentItem and code)
  const updateRemarks = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    updated[sectionIdx] = {
      ...updated[sectionIdx],
      items: updated[sectionIdx].items.map((itm, idx) =>
        idx === itemIdx ? { ...itm, remarks: value } : itm
      ),
    };
    onChange(updated);
  };

  // Update value for input-type items (dynamic name: value if entered, else original name)
  const updateValue = (sectionIdx, itemIdx, value) => {
    const updated = [...checklist];
    const item = updated[sectionIdx].items[itemIdx];
    const originalName = item.originalName || item.name; // Fallback to original auto-generated name
    updated[sectionIdx].items[itemIdx] = {
      ...item,
      value: value,
      name: value ? value : originalName, // Dynamic if value exists; revert to original if empty
    };
    onChange(updated);
  };

  // ✅ New function to open image preview
  const openImagePreview = (imageUrl) => {
    setPreviewImageUrl(imageUrl);
    setImagePreviewOpen(true);
  };

  if (!checklist || checklist.length === 0) {
    return (
      <div className="card bg-base-200 shadow-md p-6">
        <p className="text-center text-gray-500">No checklist available.</p>
      </div>
    );
  }

  const section = checklist[currentSection] || { section: "No section", items: [] };

  return (
    <div className="card bg-base-200 shadow-md p-6">
      <h4 className="text-lg font-semibold mb-4">Job Checklist</h4>

      {/* Legend for Normal Checklist */}
      {specialStep === 0 && (
        <div className="mb-4">
          <h6 className="text-sm font-semibold mb-2">Legend:</h6>
          <div className="flex space-x-6 text-sm">
            <span>⭕ Good</span>
            <span>❌ No Good</span>
            <span>ⓧ Corrected</span>
            <span>🚫 N/A</span>
          </div>
        </div>
      )}

      {/* ✅ Conditional header based on step */}
      {specialStep === 0 ? (
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-bold">Section: {section.section}</h5>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2">
          <h5 className="font-bold">
            Special Checklist {specialStep}: {
              specialStep === 1 ? "Appearance" :
              specialStep === 2 ? "Summary" :
              "Technical"
            }
          </h5>
        </div>
      )}

      {/* ✅ Conditional rendering for normal vs. special checklists */}
      {specialStep === 0 ? (
        // Normal checklist table
        <>
          <table className="table w-full border">
            <thead>
              <tr>
                <th className="text-center">Reference</th>
                <th className="text-center">Item Name</th>
                <th className="text-center">Status</th>
                <th className="text-center">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {section.items.map((item, idx) => {
                const statusSymbols = {
                  good: "⭕",
                  noGood: "❌",
                  corrected: "ⓧ",
                  na: "🚫",
                };
                return (
                  <tr key={item._id || idx}>
                    <td className="text-center">
                      {item.image ? (
                        <img
                          src={`${API_BASE_URL}${item.image}`}
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform mx-auto"
                          onClick={() => openImagePreview(`${API_BASE_URL}${item.image}`)}
                        />
                      ) : (
                        <span className="text-gray-400 text-sm">No Image</span>
                      )}
                    </td>
                    <td className="text-center">
                      {item.type === "input" ? (
                        <input
                          type="text"
                          placeholder="Enter serial number"
                          value={item.value || ""}
                          onChange={(e) => updateValue(currentSection, idx, e.target.value)}
                          className="input input-bordered w-full"
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-lg font-semibold">
                          {statusSymbols[item.status] || "ℹ️"}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            className={`btn btn-xs ${item.status === "good" ? "btn-success" : "btn-outline"}`}
                            onClick={() => updateStatus(currentSection, idx, "good")}
                          >
                            ⭕
                          </button>
                          <button
                            className={`btn btn-xs ${item.status === "noGood" ? "btn-error" : "btn-outline"}`}
                            onClick={() => updateStatus(currentSection, idx, "noGood")}
                          >
                            ❌
                          </button>
                          <button
                            className={`btn btn-xs ${item.status === "corrected" ? "btn-warning" : "btn-outline"}`}
                            onClick={() => updateStatus(currentSection, idx, "corrected")}
                          >
                            ⓧ
                          </button>
                          <button
                            className={`btn btn-xs ${item.status === "na" ? "btn-info" : "btn-outline"}`}
                            onClick={() => updateStatus(currentSection, idx, "na")}
                          >
                            🚫
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="text-center">
                      {item.status === "noGood" ? (
                        <input
                          type="text"
                          placeholder="Remarks (required)"
                          value={item.remarks || ""}
                          onChange={(e) => updateRemarks(currentSection, idx, e.target.value)}
                          className="input input-bordered w-full border-red-500"
                          required
                        />
                      ) : item.status === "corrected" ? (
                        <input
                          type="text"
                          placeholder="Remarks (optional)"
                          value={item.remarks || ""}
                          onChange={(e) => updateRemarks(currentSection, idx, e.target.value)}
                          className="input input-bordered w-full"
                        />
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {section.items.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center text-gray-500">
                    No items in this section
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </>
      ) : specialStep === 1 ? (
        <AppearanceChecklist
          data={localAppearanceData}
          onChange={setLocalAppearanceData}
          onSave={() => setSpecialStep(2)} // ✅ No save; just proceed
          appearanceImages={appearanceImages} // ✅ New: Pass appearance images
          showLegend={false} // ✅ Hide legend for special checklists
        />
      ) : specialStep === 2 ? (
        <SummaryChecklist
          data={localSummaryData}
          onChange={setLocalSummaryData}
          onSave={() => setSpecialStep(3)} // ✅ No save; just proceed
          showLegend={false} // ✅ Hide legend for special checklists
        />
      ) : (
        <TechnicalChecklist
          data={localTechnicalData}
          onChange={setLocalTechnicalData}
          onSave={() => setPreviewOpen(true)} // ✅ Proceed to preview after last special
          showLegend={false} // ✅ Hide legend for special checklists
        />
      )}

      {/* Navigation - ✅ Updated for special steps */}
      <div className="flex justify-between mt-6">
        {(currentSection > 0 && specialStep === 0) && (
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentSection(currentSection - 1)}
          >
            Previous
          </button>
        )}
        {specialStep > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => setSpecialStep(specialStep - 1)}
          >
            Back to Previous Special
          </button>
        )}
        {currentSection < checklist.length - 1 && specialStep === 0 ? (
          <button
            className="btn btn-primary ml-auto"
            onClick={() => setCurrentSection(currentSection + 1)}
          >
            Next
          </button>
        ) : specialStep === 0 ? (
          <button
            className="btn btn-warning ml-auto"
            onClick={() => setSpecialStep(1)}
          >
            Start Special Checklists
          </button>
        ) : specialStep < 3 ? (
          <button
            className="btn btn-primary ml-auto"
            onClick={() => setSpecialStep(specialStep + 1)}
          >
            Next Special
          </button>
        ) : null}
      </div>

      {/* Preview modal - ✅ Full details of all checklists */}
      {previewOpen && job && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="border-b border-base-300 px-6 py-4 sticky top-0 bg-base-100 z-10">
              <h3 className="text-xl font-semibold text-primary">Full Checklist Preview</h3>
              <p className="text-sm text-base-content/70">
                Review all sections and special checklists before finalizing
              </p>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-6">
              {/* Normal checklist sections - Full details */}
              {checklist.map((sec) => (
                <div
                  key={sec._id || sec.section}
                  className="border border-base-300 rounded-lg p-4 shadow-sm bg-base-200"
                >
                  <h4 className="text-lg font-bold text-secondary mb-3 border-b border-base-300 pb-1">
                    {sec.section}
                  </h4>
                  <ul className="space-y-2">
                    {sec.items
                      .filter((item) => !(item.type === "input" && !item.value))
                      .map((item) => {
                        const statusSymbols = {
                          good: "⭕",
                          noGood: "❌",
                          corrected: "ⓧ",
                          na: "🚫",
                        };
                        return (
                          <li
                            key={item._id || item.name}
                            className="flex items-start justify-between border-b border-base-300 pb-2 last:border-b-0"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {item.image && (
                                <img
                                  src={`${API_BASE_URL}${item.image}`}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-105 transition-transform shrink-0"
                                  onClick={() => openImagePreview(`${API_BASE_URL}${item.image}`)}
                                />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium text-base-content">
                                  {item.name}
                                </span>
                                {item.remarks && (
                                  <span className="text-sm text-base-content/70 mt-1">
                                    Remarks: {item.remarks}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-lg">
                              {statusSymbols[item.status] || "ℹ️"}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                  {sec.items.filter((item) => !(item.type === "input" && !item.value)).length === 0 && (
                    <p className="text-center text-base-content/70 py-4">No applicable items in this section.</p>
                  )}
                </div>
              ))}

             {/* ✅ Enhanced: Appearance with canvas-overlaid marks (like AppearanceChecklist) */}
<div className="border border-base-300 rounded-lg p-4 shadow-sm bg-base-200">
  <h4 className="text-lg font-bold text-warning mb-3 border-b border-base-300 pb-1">
    Appearance Checklist Details
  </h4>
  {localAppearanceData.length > 0 ? (
    <div className="space-y-4">
      {/* Display marks grouped by side with canvas overlay */}
      {['front', 'rear', 'left', 'right'].map(side => {
        const sideMarks = localAppearanceData.filter(mark => mark.side === side);
        if (sideMarks.length === 0) return null;
        return (
          <AppearancePreviewCanvas
            key={side}
            side={side}
            marks={sideMarks}
            imageSrc={appearanceImages?.[side] ? `${API_BASE_URL}${appearanceImages[side]}` : '/images/default-appearance.jpg'}
          />
        );
      })}
    </div>
  ) : (
    <p className="text-base-content/70">No defects marked.</p>
  )}
</div>

              {/* ✅ Summary in table format (already is) */}
              <div className="border border-base-300 rounded-lg p-4 shadow-sm bg-base-200">
                <h4 className="text-lg font-bold text-info mb-3 border-b border-base-300 pb-1">
                  Summary Checklist Details
                </h4>
                {localSummaryData.length > 0 ? (
                  <table className="table w-full">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Defect Code</th>
                        <th>Defect Encountered</th>
                        <th>Status</th>
                        <th>Recurrence</th>
                        <th>Image</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSummaryData.map((defect, idx) => (
                        <tr key={idx}>
                          <td>{defect.no}</td>
                          <td>{defect.defectCode}</td>
                          <td>{defect.defectEncountered}</td>
                          <td>{defect.status}</td>
                          <td>{defect.recurrence}</td>
                          <td>
                            {/* ✅ Fixed: Check if image is a File before using createObjectURL */}
                            {defect.image && defect.image instanceof File && (
                              <img
                                src={URL.createObjectURL(defect.image)}
                                alt="Defect"
                                className="w-10 h-10 object-cover rounded cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => openImagePreview(URL.createObjectURL(defect.image))}
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-base-content/70">No defects listed.</p>
                )}
              </div>

              {/* ✅ Enhanced: Technical in card-based layout */}
<div className="border border-base-300 rounded-lg p-4 shadow-sm bg-base-200">
  <h4 className="text-lg font-bold text-success mb-3 border-b border-base-300 pb-1">
    Technical Checklist Details
  </h4>
  {Object.keys(localTechnicalData).length > 0 ? (
    <div className="space-y-4">
      {/* Breaking Force */}
      {localTechnicalData.breakingForce && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Breaking Force (daN)</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Max Front</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.max?.front?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.max?.front?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.max?.front?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.max?.front?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Max Rear</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.max?.rear?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.max?.rear?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.max?.rear?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.max?.rear?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Min Front</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.min?.front?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.min?.front?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.min?.front?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.min?.front?.difference || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Min Rear</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.breakingForce.min?.rear?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.breakingForce.min?.rear?.right || 'N/A'}</li>
                <li>Sum: {localTechnicalData.breakingForce.min?.rear?.sum || 'N/A'}</li>
                <li>Difference: {localTechnicalData.breakingForce.min?.rear?.difference || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Speed Testing */}
      {localTechnicalData.speedTesting && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Speed Testing</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-base-content/80">Speedometer:</span>
              <p className="text-sm text-base-content mt-1">{localTechnicalData.speedTesting.speedometer || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-base-content/80">Tester:</span>
              <p className="text-sm text-base-content mt-1">{localTechnicalData.speedTesting.tester || 'N/A'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Turning Radius */}
      {localTechnicalData.turningRadius && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Turning Radius</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Inner</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.turningRadius.inner?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.turningRadius.inner?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Outer</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.turningRadius.outer?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.turningRadius.outer?.right || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Slip Tester */}
      {localTechnicalData.slipTester && localTechnicalData.slipTester.length > 0 && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Slip Tester</h5>
          <ul className="text-sm space-y-1">
            {localTechnicalData.slipTester.map((slip, idx) => (
              <li key={idx}>Speed: {slip.speed}, Value: {slip.value}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Headlight Tester */}
      {localTechnicalData.headlightTester && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">Headlight Tester</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Low Beam Before</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.lowBeam?.before?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.lowBeam?.before?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">Low Beam After</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.lowBeam?.after?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.lowBeam?.after?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">High Beam Before</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.highBeam?.before?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.highBeam?.before?.right || 'N/A'}</li>
              </ul>
            </div>
            <div>
              <h6 className="text-sm font-medium text-base-content/80 mb-2">High Beam After</h6>
              <ul className="text-sm space-y-1">
                <li>Left: {localTechnicalData.headlightTester.highBeam?.after?.left || 'N/A'}</li>
                <li>Right: {localTechnicalData.headlightTester.highBeam?.after?.right || 'N/A'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ABS Testing */}
      {localTechnicalData.absTesting && localTechnicalData.absTesting.length > 0 && (
        <div className="bg-base-100 p-4 rounded-lg shadow-sm border">
          <h5 className="font-semibold text-base-content mb-3">ABS Testing</h5>
          <ul className="text-sm space-y-1">
            {localTechnicalData.absTesting.map((abs, idx) => (
              <li key={idx}>{abs.option}: {abs.remarks}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : (
    <p className="text-base-content/70">No tests completed.</p>
  )}
</div>
            </div>

            <div className="flex justify-end space-x-2 border-t border-base-300 px-6 py-3 bg-base-200 sticky bottom-0 z-10">
              <button
                className="btn btn-sm btn-neutral"
                onClick={() => setPreviewOpen(false)}
                disabled={saving}
              >
                Back
              </button>
              <button
                className="btn btn-sm btn-success"
                disabled={saving}
                onClick={async () => {
                  try {
                    setSaving(true);
                    // ✅ Add console logs here to debug
                    console.log("📋 localAppearanceData:", localAppearanceData);
                    console.log("📋 localSummaryData:", localSummaryData);
                    console.log("📋 localTechnicalData:", localTechnicalData);
                    // ✅ Updated: Pass data in correct structure (appearanceData as array)
                    await onSaveAll({
                      checklist,
                      appearanceData: localAppearanceData, // ✅ Direct array
                      summaryData: localSummaryData,
                      technicalData: localTechnicalData,
                    });
                    setPreviewOpen(false);
                    clearLocalStorage(); // ✅ Clear localStorage on final save
                    toast.success("All checklists finalized and saved successfully!");
                  } catch (err) {
                    console.error("❌ Error finalizing all checklists:", err);
                    toast.error("Failed to save all checklists!");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving..." : "Confirm & Save All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Image Preview Modal */}
      {imagePreviewOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-base-100 rounded-lg shadow-xl max-w-4xl max-h-[90vh] p-4 relative">
            <button
              className="btn btn-sm btn-circle btn-error absolute top-2 right-2"
              onClick={() => setImagePreviewOpen(false)}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold mb-4 text-center">Image Preview</h3>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="w-full h-auto max-h-[70vh] object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistWizard;