import React, { useState, useRef, useEffect } from "react";

// ✅ Add API_BASE_URL for dynamic images
const API_BASE_URL = 'http://localhost:5000';

const AppearanceChecklist = ({ data, onChange, onSave, appearanceImages }) => { // ✅ Props: data (marks array), onChange, onSave, appearanceImages
  const [marks, setMarks] = useState(data || []); // ✅ data is the marks array
  const [currentSide, setCurrentSide] = useState('front');
  const [mode, setMode] = useState('circle'); // 'circle' or 'freehand'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [previewMark, setPreviewMark] = useState(null); // For real-time preview during drawing
  const [draggedMarkIndex, setDraggedMarkIndex] = useState(null); // Index of mark being dragged or resized
  const [isResizing, setIsResizing] = useState(false); // Flag for resizing vs. repositioning
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  const sides = ['front', 'rear', 'left', 'right'];

  // ✅ Updated: Use dynamic images from prop, with fallbacks to defaults
  const images = {
    front: appearanceImages?.front ? `${API_BASE_URL}${appearanceImages.front}` : '/images/front-draft.png',
    rear: appearanceImages?.rear ? `${API_BASE_URL}${appearanceImages.rear}` : '/images/rear-draft.png',
    left: appearanceImages?.left ? `${API_BASE_URL}${appearanceImages.left}` : '/images/left-draft.png',
    right: appearanceImages?.right ? `${API_BASE_URL}${appearanceImages.right}` : '/images/right-draft.png',
  };

  // Predefined defect codes (expand as needed)
  const defectOptions = [
    { value: 'C', label: 'C - Crack' },
    { value: 'SC', label: 'SC - Scratch' },
    { value: 'D', label: 'D - Dent' },
    // Add more: { value: 'B', label: 'B - Bulge' }, etc.
  ];

  // ✅ NEW: Sync marks with data prop to load existing marks
  useEffect(() => {
    const syncedMarks = (data || []).map((mark, idx) => ({
      side: mark.side || 'front',
      type: mark.type || 'circle',  // ✅ Default type
      x: mark.x || 0,
      y: mark.y || 0,
      radius: mark.radius || 0.05,  // ✅ Default radius
      defectName: mark.defectName || `Defect${idx + 1}`,
      remarks: mark.remarks || '',
      path: mark.path || [],  // ✅ Default path
      image: mark.image || null,
    }));
    setMarks(syncedMarks);
  }, [data]);

  // Update canvas size and img dimensions when image loads or side changes
  useEffect(() => {
    const img = imgRef.current;
    if (img) {
      const updateDimensions = () => {
        const width = img.offsetWidth;
        const height = img.offsetHeight;
        setImgDimensions({ width, height });
        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          redrawCanvas();
        }
      };
      img.addEventListener('load', updateDimensions);
      // Initial call in case image is already loaded
      if (img.complete) updateDimensions();
      // Handle window resize for responsiveness
      window.addEventListener('resize', updateDimensions);
      return () => {
        img.removeEventListener('load', updateDimensions);
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, [currentSide, marks, previewMark, draggedMarkIndex, isResizing]); // ✅ Added isResizing to redraw on resize

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw permanent marks
    marks.filter(m => m.side === currentSide).forEach((mark, idx) => {
      const isSelected = draggedMarkIndex === marks.indexOf(mark); // ✅ Check if this mark is selected
      ctx.strokeStyle = isSelected ? 'blue' : 'red'; // ✅ Highlight selected mark in blue
      ctx.lineWidth = isSelected ? 3 : 2; // ✅ Thicker border for selected mark
      if (mark.type === 'circle') {
        ctx.beginPath();
        ctx.arc(mark.x * canvas.width, mark.y * canvas.height, mark.radius * Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
        ctx.stroke();
        // Add label if defectName exists
        if (mark.defectName) {
          ctx.fillStyle = isSelected ? 'blue' : 'red';
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
          ctx.fillStyle = isSelected ? 'blue' : 'red';
          ctx.font = '16px Arial';
          ctx.fillText(mark.defectName, mark.path[0].x * canvas.width + 5, mark.path[0].y * canvas.height - 5);
        }
      }
    });
    // Draw preview mark (lighter/dashed for feedback)
    if (previewMark) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
      ctx.setLineDash([5, 5]); // Dashed line
      ctx.lineWidth = 2;
      if (previewMark.type === 'circle') {
        ctx.beginPath();
        ctx.arc(previewMark.x * canvas.width, previewMark.y * canvas.height, previewMark.radius * Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
        ctx.stroke();
      } else if (previewMark.type === 'path') {
        ctx.beginPath();
        previewMark.path.forEach((point, i) => {
          const px = point.x * canvas.width;
          const py = point.y * canvas.height;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset to solid
    }
  };

  // ✅ Improved: Helper to detect mark at position (distinguishes center vs. edge for circles)
  const getMarkAtPosition = (x, y, checkEdge = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const sideMarks = marks.filter(m => m.side === currentSide);
    for (let i = sideMarks.length - 1; i >= 0; i--) { // Check from top (last drawn)
      const mark = sideMarks[i];
      if (mark.type === 'circle') {
        const dx = x - mark.x * canvas.width;
        const dy = y - mark.y * canvas.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radiusPixels = mark.radius * Math.min(canvas.width, canvas.height);
        if (checkEdge) {
          // For resizing: Check if near the edge (within 10px of radius)
          if (Math.abs(distance - radiusPixels) <= 10) {
            return marks.indexOf(mark);
          }
        } else {
          // For repositioning: Check if inside the circle (but not too close to edge)
          if (distance <= radiusPixels - 10) { // Avoid overlap with edge detection
            return marks.indexOf(mark);
          }
        }
      } else if (mark.type === 'path' && !checkEdge) {
        // Check if near any point in the path (for repositioning only)
        for (const point of mark.path) {
          const dx = x - point.x * canvas.width;
          const dy = y - point.y * canvas.height;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 10) {
            return marks.indexOf(mark);
          }
        }
      }
    }
    return null;
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    if (mode === 'circle') {
      // ✅ First, check for resizing (edge of circle)
      const resizeMarkIndex = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top, true);
      if (resizeMarkIndex !== null) {
        setDraggedMarkIndex(resizeMarkIndex);
        setIsResizing(true);
        canvas.style.cursor = 'ew-resize';
        return;
      }

      // ✅ Then, check for repositioning (center of circle or path)
      const dragMarkIndex = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top);
      if (dragMarkIndex !== null && !isDrawing) {
        setDraggedMarkIndex(dragMarkIndex);
        canvas.style.cursor = 'grabbing';
        return;
      }

      // Otherwise, start drawing a new circle
      setIsDrawing(true);
      setCurrentPath({ x, y, startX: x, startY: y });
      setPreviewMark({ type: 'circle', x, y, radius: 0 });
    } else if (mode === 'freehand') {
      // Check for repositioning paths
      const dragMarkIndex = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top);
      if (dragMarkIndex !== null && !isDrawing) {
        setDraggedMarkIndex(dragMarkIndex);
        canvas.style.cursor = 'grabbing';
        return;
      }

      // Otherwise, start drawing a new path
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
      setPreviewMark({ type: 'path', path: [{ x, y }] });
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    // ✅ Handle resizing
    if (isResizing && draggedMarkIndex !== null) {
      const updatedMarks = [...marks];
      const mark = updatedMarks[draggedMarkIndex];
      if (mark.type === 'circle') {
        const dx = x - mark.x;
        const dy = y - mark.y;
        mark.radius = Math.max(0.01, Math.sqrt(dx * dx + dy * dy)); // Update radius, min 0.01
      }
      setMarks(updatedMarks);
      onChange(updatedMarks);
      return;
    }

    // ✅ Handle repositioning
    if (draggedMarkIndex !== null && !isResizing) {
      const updatedMarks = [...marks];
      const mark = updatedMarks[draggedMarkIndex];
      if (mark.type === 'circle') {
        mark.x = x;
        mark.y = y;
      } else if (mark.type === 'path') {
        // Move entire path by offset
        const offsetX = x - mark.path[0].x;
        const offsetY = y - mark.path[0].y;
        mark.path = mark.path.map(point => ({
          x: point.x + offsetX,
          y: point.y + offsetY,
        }));
      }
      setMarks(updatedMarks);
      onChange(updatedMarks);
      return;
    }

    // ✅ Update cursor for hover
    if (!isDrawing && draggedMarkIndex === null) {
      if (mode === 'circle') {
        const resizeHover = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top, true);
        if (resizeHover !== null) {
          canvas.style.cursor = 'ew-resize';
          return;
        }
        const dragHover = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top);
        canvas.style.cursor = dragHover !== null ? 'grab' : 'crosshair';
      } else {
        const dragHover = getMarkAtPosition(e.clientX - rect.left, e.clientY - rect.top);
        canvas.style.cursor = dragHover !== null ? 'grab' : 'crosshair';
      }
    }

    // Otherwise, handle drawing preview
    if (!isDrawing) return;
    if (mode === 'circle') {
      const radius = Math.sqrt((x - currentPath.startX) ** 2 + (y - currentPath.startY) ** 2);
      setPreviewMark({ type: 'circle', x: currentPath.startX, y: currentPath.startY, radius });
    } else if (mode === 'freehand') {
      setCurrentPath(prev => [...prev, { x, y }]);
      setPreviewMark({ type: 'path', path: [...currentPath, { x, y }] });
    }
  };

  const handleCanvasMouseUp = (e) => {
    // ✅ Stop resizing or repositioning and reset cursor
    if (draggedMarkIndex !== null) {
      setDraggedMarkIndex(null);
      setIsResizing(false);
      if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      return;
    }

    // Otherwise, finalize drawing
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;
    let newMark;
    if (mode === 'circle') {
      const radius = Math.sqrt((x - currentPath.startX) ** 2 + (y - currentPath.startY) ** 2);
      // ✅ Default defectName to "Defect1", "Defect2", etc. per side
      const sideMarks = marks.filter(m => m.side === currentSide);
      newMark = { side: currentSide, type: 'circle', x: currentPath.startX, y: currentPath.startY, radius, defectName: `Defect${sideMarks.length + 1}`, remarks: '' };
    } else if (mode === 'freehand') {
      // ✅ Default defectName to "Defect1", "Defect2", etc. per side
      const sideMarks = marks.filter(m => m.side === currentSide);
      newMark = { side: currentSide, type: 'path', path: currentPath, defectName: `Defect${sideMarks.length + 1}`, remarks: '' };
    }
    const updatedMarks = [...marks, newMark];
    setMarks(updatedMarks);
    onChange(updatedMarks);
    setIsDrawing(false);
    setCurrentPath([]);
    setPreviewMark(null);
  };

  const deleteMark = (idx) => {
    const updatedMarks = marks.filter((_, i) => i !== idx);
    setMarks(updatedMarks);
    onChange(updatedMarks);
  };

  const updateMark = (idx, field, value) => {
    const updatedMarks = marks.map((m, i) => i === idx ? { ...m, [field]: value } : m);
    setMarks(updatedMarks);
    onChange(updatedMarks);
  };

  return (
    <div className="card bg-base-200 shadow-md p-4 md:p-6"> {/* ✅ Responsive: Adaptive padding */}
      <h4 className="text-lg font-semibold mb-4 text-warning">Appearance Checklist</h4>
      <p className="text-sm text-base-content/70 mb-4">
        Select mode: Circle (click and drag to draw circle, or click and drag existing circles to reposition or resize) or Freehand (click and drag to draw path, or reposition existing paths). Marks will appear on the image. Select defect type and add remarks for each.
      </p>

      <div className="tabs tabs-boxed mb-4 overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for tabs on small screens */}
        {sides.map(side => (
          <a key={side} className={`tab ${currentSide === side ? 'tab-active' : ''}`} onClick={() => setCurrentSide(side)}>
            {side.charAt(0).toUpperCase() + side.slice(1)} Side
          </a>
        ))}
      </div>

      <div className="mb-4">
        <div className="btn-group flex flex-wrap"> {/* ✅ Responsive: Wrap buttons */}
          <button className={`btn ${mode === 'circle' ? 'btn-active' : ''}`} onClick={() => setMode('circle')}>Circle Mode</button>
          <button className={`btn ${mode === 'freehand' ? 'btn-active' : ''}`} onClick={() => setMode('freehand')}>Freehand Mode</button>
        </div>
      </div>

      <div className="relative mb-4">
        <img ref={imgRef} src={images[currentSide]} alt={`${currentSide} side`} className="w-full h-auto border rounded" /> {/* ✅ Responsive: Scales with container */}
               <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full" // ✅ Cursor set dynamically
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
        />
      </div>

      <div className="mt-4 overflow-x-auto"> {/* ✅ Responsive: Horizontal scroll for list on small screens */}
        <h5 className="font-semibold mb-2 text-sm md:text-base">Marked Defects on {currentSide.charAt(0).toUpperCase() + currentSide.slice(1)} Side:</h5> {/* ✅ Responsive: Adaptive text size */}
        {marks.filter(m => m.side === currentSide).length > 0 ? (
          <ul className="space-y-3">
            {marks.filter(m => m.side === currentSide).map((mark, idx) => (
              <li key={idx} className="border border-base-300 p-3 rounded">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-2"> {/* ✅ Responsive: Stack vertically on mobile */}
                  <span className="font-medium text-sm md:text-base">Defect {idx + 1} ({mark.type}) - {mark.defectName}</span> {/* ✅ Shows name like "Defect1" */}
                  <button className="btn btn-sm btn-error w-full md:w-auto" onClick={() => deleteMark(marks.indexOf(mark))}>Delete</button> {/* ✅ Responsive: Full width on mobile */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* ✅ Responsive: Single column on mobile */}
                  <div>
                    <label className="label text-sm font-medium">Defect Name</label>
                    <select
                      value={mark.defectName || ''}
                      onChange={(e) => updateMark(marks.indexOf(mark), 'defectName', e.target.value)}
                      className="select select-bordered w-full"
                    >
                      <option value="">Select Defect</option>
                      {defectOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label text-sm font-medium">Remarks</label>
                    <input
                      type="text"
                      placeholder="Add remarks"
                      value={mark.remarks || ''}
                      onChange={(e) => updateMark(marks.indexOf(mark), 'remarks', e.target.value)}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base-content/70">No defects marked on this side.</p>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-end mt-4 space-y-2 md:space-y-0 md:space-x-2"> {/* ✅ Responsive: Stack buttons */}
        <button className="btn btn-success w-full md:w-auto" onClick={() => onSave({ marks })}>Save Appearance Checklist</button> {/* ✅ Responsive: Full width on mobile */}
      </div>
    </div>
  );
};

export default AppearanceChecklist;