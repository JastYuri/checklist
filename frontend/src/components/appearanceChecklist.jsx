import React, { useState, useRef, useEffect } from "react";

const AppearanceChecklist = ({ data, onChange, onSave, appearanceImages }) => {
  const [marks, setMarks] = useState(data || []);
  const [currentSide, setCurrentSide] = useState('front');
  const [mode, setMode] = useState('circle'); // 'circle' or 'freehand'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [previewMark, setPreviewMark] = useState(null);
  const [draggedMarkIndex, setDraggedMarkIndex] = useState(null);
  const [isResizing, setIsResizing] = useState(false);
  
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [imgDimensions, setImgDimensions] = useState({ width: 0, height: 0 });

  // 🔽 NEW: Ref to track last valid coordinates for TouchEnd events
  const lastPos = useRef({ x: 0, y: 0 });

  const sides = ['front', 'rear', 'left', 'right'];

  const images = {
    front: appearanceImages?.front || '/images/front-draft.png',
    rear: appearanceImages?.rear || '/images/rear-draft.png',
    left: appearanceImages?.left || '/images/left-draft.png',
    right: appearanceImages?.right || '/images/right-draft.png',
  };

  const defectOptions = [
    { value: 'C', label: 'C - Crack' },
    { value: 'SC', label: 'SC - Scratch' },
    { value: 'D', label: 'D - Dent' },
  ];

  // Sync marks with data prop
  useEffect(() => {
    const syncedMarks = (data || []).map((mark, idx) => ({
      side: mark.side || 'front',
      type: mark.type || 'circle',
      x: mark.x || 0,
      y: mark.y || 0,
      radius: mark.radius || 0.05,
      defectName: mark.defectName || `Defect${idx + 1}`,
      remarks: mark.remarks || '',
      path: mark.path || [],
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
      if (img.complete) updateDimensions();
      
      window.addEventListener('resize', updateDimensions);
      return () => {
        img.removeEventListener('load', updateDimensions);
        window.removeEventListener('resize', updateDimensions);
      };
    }
  }, [currentSide, marks, previewMark, draggedMarkIndex, isResizing]);

  // 🔽 NEW: Helper to get X/Y from either Mouse or Touch events
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      // Touch event
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / canvas.width;
    const y = (clientY - rect.top) / canvas.height;

    // Update ref for use in TouchEnd
    lastPos.current = { x, y, rawX: clientX - rect.left, rawY: clientY - rect.top };

    return { x, y, rawX: clientX - rect.left, rawY: clientY - rect.top };
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    marks.filter(m => m.side === currentSide).forEach((mark) => {
      const isSelected = draggedMarkIndex === marks.indexOf(mark);
      ctx.strokeStyle = isSelected ? 'blue' : 'red';
      ctx.lineWidth = isSelected ? 3 : 2;
      
      if (mark.type === 'circle') {
        ctx.beginPath();
        ctx.arc(mark.x * canvas.width, mark.y * canvas.height, mark.radius * Math.min(canvas.width, canvas.height), 0, 2 * Math.PI);
        ctx.stroke();
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
        if (mark.defectName && mark.path.length > 0) {
          ctx.fillStyle = isSelected ? 'blue' : 'red';
          ctx.font = '16px Arial';
          ctx.fillText(mark.defectName, mark.path[0].x * canvas.width + 5, mark.path[0].y * canvas.height - 5);
        }
      }
    });

    if (previewMark) {
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.setLineDash([5, 5]);
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
      ctx.setLineDash([]);
    }
  };

  const getMarkAtPosition = (x, y, checkEdge = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const sideMarks = marks.filter(m => m.side === currentSide);
    for (let i = sideMarks.length - 1; i >= 0; i--) {
      const mark = sideMarks[i];
      if (mark.type === 'circle') {
        const dx = x - mark.x * canvas.width;
        const dy = y - mark.y * canvas.height;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radiusPixels = mark.radius * Math.min(canvas.width, canvas.height);
        
        if (checkEdge) {
          if (Math.abs(distance - radiusPixels) <= 10) return marks.indexOf(mark);
        } else {
          if (distance <= radiusPixels - 10) return marks.indexOf(mark);
        }
      } else if (mark.type === 'path' && !checkEdge) {
        for (const point of mark.path) {
          const dx = x - point.x * canvas.width;
          const dy = y - point.y * canvas.height;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= 15) return marks.indexOf(mark); // Increased tolerance for touch
        }
      }
    }
    return null;
  };

  // Unified Handler for Start (Mouse & Touch)
  const handleStart = (e) => {
    // Prevent default only inside canvas to allow scrolling outside
    // Note: e.preventDefault() inside touchstart prevents mouse emulation
    // but requires touch-action: none in CSS
    if (e.cancelable) e.preventDefault(); 
    
    const coords = getCoords(e);
    if (!coords) return;
    const { x, y, rawX, rawY } = coords;
    const canvas = canvasRef.current;

    if (mode === 'circle') {
      const resizeMarkIndex = getMarkAtPosition(rawX, rawY, true);
      if (resizeMarkIndex !== null) {
        setDraggedMarkIndex(resizeMarkIndex);
        setIsResizing(true);
        canvas.style.cursor = 'ew-resize';
        return;
      }

      const dragMarkIndex = getMarkAtPosition(rawX, rawY);
      if (dragMarkIndex !== null && !isDrawing) {
        setDraggedMarkIndex(dragMarkIndex);
        canvas.style.cursor = 'grabbing';
        return;
      }

      setIsDrawing(true);
      setCurrentPath({ x, y, startX: x, startY: y });
      setPreviewMark({ type: 'circle', x, y, radius: 0 });
    } else if (mode === 'freehand') {
      const dragMarkIndex = getMarkAtPosition(rawX, rawY);
      if (dragMarkIndex !== null && !isDrawing) {
        setDraggedMarkIndex(dragMarkIndex);
        canvas.style.cursor = 'grabbing';
        return;
      }

      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
      setPreviewMark({ type: 'path', path: [{ x, y }] });
    }
  };

  // Unified Handler for Move (Mouse & Touch)
  const handleMove = (e) => {
    if (e.cancelable) e.preventDefault();
    
    const canvas = canvasRef.current;
    const coords = getCoords(e);
    if (!coords) return;
    const { x, y, rawX, rawY } = coords;

    if (isResizing && draggedMarkIndex !== null) {
      const updatedMarks = [...marks];
      const mark = updatedMarks[draggedMarkIndex];
      if (mark.type === 'circle') {
        const dx = x - mark.x;
        const dy = y - mark.y;
        mark.radius = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
      }
      setMarks(updatedMarks);
      onChange(updatedMarks);
      return;
    }

    if (draggedMarkIndex !== null && !isResizing) {
      const updatedMarks = [...marks];
      const mark = updatedMarks[draggedMarkIndex];
      if (mark.type === 'circle') {
        mark.x = x;
        mark.y = y;
      } else if (mark.type === 'path') {
        const offsetX = x - mark.path[0].x;
        const offsetY = y - mark.path[0].y;
        mark.path = mark.path.map(point => ({ x: point.x + offsetX, y: point.y + offsetY }));
      }
      setMarks(updatedMarks);
      onChange(updatedMarks);
      return;
    }

    // Cursor hover logic
    if (!isDrawing && draggedMarkIndex === null && canvas) {
      if (mode === 'circle') {
        const resizeHover = getMarkAtPosition(rawX, rawY, true);
        if (resizeHover !== null) {
          canvas.style.cursor = 'ew-resize';
          return;
        }
        const dragHover = getMarkAtPosition(rawX, rawY);
        canvas.style.cursor = dragHover !== null ? 'grab' : 'crosshair';
      } else {
        const dragHover = getMarkAtPosition(rawX, rawY);
        canvas.style.cursor = dragHover !== null ? 'grab' : 'crosshair';
      }
    }

    if (!isDrawing) return;
    
    if (mode === 'circle') {
      const radius = Math.sqrt((x - currentPath.startX) ** 2 + (y - currentPath.startY) ** 2);
      setPreviewMark({ type: 'circle', x: currentPath.startX, y: currentPath.startY, radius });
    } else if (mode === 'freehand') {
      setCurrentPath(prev => [...prev, { x, y }]);
      setPreviewMark({ type: 'path', path: [...currentPath, { x, y }] });
    }
  };

  // Unified Handler for End (Mouse Up & Touch End)
  const handleEnd = (e) => {
    if (e.cancelable) e.preventDefault();

    if (draggedMarkIndex !== null) {
      setDraggedMarkIndex(null);
      setIsResizing(false);
      if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
      return;
    }

    if (!isDrawing) return;
    
    // Use lastPos because TouchEnd doesn't provide coordinates
    const x = lastPos.current.x;
    const y = lastPos.current.y;

    const canvas = canvasRef.current;
    if (!canvas) return;

    let newMark;
    if (mode === 'circle') {
      const radius = Math.sqrt((x - currentPath.startX) ** 2 + (y - currentPath.startY) ** 2);
      const sideMarks = marks.filter(m => m.side === currentSide);
      newMark = { side: currentSide, type: 'circle', x: currentPath.startX, y: currentPath.startY, radius, defectName: `Defect${sideMarks.length + 1}`, remarks: '' };
    } else if (mode === 'freehand') {
      const sideMarks = marks.filter(m => m.side === currentSide);
      newMark = { side: currentSide, type: 'path', path: currentPath, defectName: `Defect${sideMarks.length + 1}`, remarks: '' };
    }
    
    if (newMark) {
      const updatedMarks = [...marks, newMark];
      setMarks(updatedMarks);
      onChange(updatedMarks);
    }
    
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
    <div className="card bg-base-200 shadow-md p-4 md:p-6">
      <h4 className="text-lg font-semibold mb-4 text-warning">Appearance Checklist</h4>
      <p className="text-sm text-base-content/70 mb-4">
        Select mode: Circle (tap and drag to draw circle, or tap and drag existing circles to reposition or resize) or Freehand (tap and drag to draw path, or reposition existing paths). Marks will appear on the image. Select defect type and add remarks for each.
      </p>

      <div className="tabs tabs-boxed mb-4 overflow-x-auto">
        {sides.map(side => (
          <a key={side} className={`tab ${currentSide === side ? 'tab-active' : ''}`} onClick={() => setCurrentSide(side)}>
            {side.charAt(0).toUpperCase() + side.slice(1)} Side
          </a>
        ))}
      </div>

      <div className="mb-4">
        <div className="btn-group flex flex-wrap">
          <button className={`btn ${mode === 'circle' ? 'btn-active' : ''}`} onClick={() => setMode('circle')}>Circle Mode</button>
          <button className={`btn ${mode === 'freehand' ? 'btn-active' : ''}`} onClick={() => setMode('freehand')}>Freehand Mode</button>
        </div>
      </div>

      <div className="relative mb-4">
        <img ref={imgRef} src={images[currentSide]} alt={`${currentSide} side`} className="w-full h-auto border rounded" />
        {/* 
          CRITICAL: touch-action: none prevents the browser from scrolling/zooming 
          while the user tries to draw on the canvas.
        */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full"
          style={{ touchAction: 'none' }} 
          
          // Mouse Events
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          
          // Touch Events
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      </div>

      <div className="mt-4 overflow-x-auto">
        <h5 className="font-semibold mb-2 text-sm md:text-base">Marked Defects on {currentSide.charAt(0).toUpperCase() + currentSide.slice(1)} Side:</h5>
        {marks.filter(m => m.side === currentSide).length > 0 ? (
          <ul className="space-y-3">
            {marks.filter(m => m.side === currentSide).map((mark, idx) => (
              <li key={idx} className="border border-base-300 p-3 rounded">
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mb-2">
                  <span className="font-medium text-sm md:text-base">Defect {idx + 1} ({mark.type}) - {mark.defectName}</span>
                  <button className="btn btn-sm btn-error w-full md:w-auto" onClick={() => deleteMark(marks.indexOf(mark))}>Delete</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      <div className="flex flex-col md:flex-row justify-end mt-4 space-y-2 md:space-y-0 md:space-x-2">
        <button className="btn btn-success w-full md:w-auto" onClick={() => onSave({ marks })}>Save Appearance Checklist</button>
      </div>
    </div>
  );
};

export default AppearanceChecklist;