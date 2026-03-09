import React, { useState } from "react";

const SummaryChecklist = ({ data, onChange, onSave, openImagePreview }) => {
  const [defects, setDefects] = useState(data || [{ 
    no: 1, 
    defectCode: '', 
    defectEncountered: '', 
    status: 'noGood', // ✅ Default to 'noGood' for new defects
    image: null, 
    recurrence: 0 
  }]);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // ✅ UPDATED: Handle image file validation (20MB, any format)
  const updateDefect = (idx, field, value) => {
    // ✅ Handle image file validation
    if (field === 'image' && value) {
      const file = value;
      // ✅ Check file size (20MB limit)
      if (file.size > 20 * 1024 * 1024) {
        alert("Image size must be less than 20MB.");
        return;
      }
      // ✅ No MIME type restriction - accept all image formats (HEIC, AVIF, etc.)
    }
    
    const updated = defects.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    setDefects(updated);
    onChange(updated);
  };

  const addDefect = () => {
    const newDefect = { 
      no: defects.length + 1, 
      defectCode: '', 
      defectEncountered: '', 
      status: 'noGood', // ✅ Default to 'noGood' for new defects
      image: null, 
      recurrence: 0 
    };
    setDefects([...defects, newDefect]);
  };

  const openPreview = (imageSrc) => {
    setPreviewImage(imageSrc);
    setIsPreviewOpen(true);
  };

  const closePreview = () => {
    setIsPreviewOpen(false);
    setPreviewImage(null);
  };

  // ✅ CORRECTED: Only 2 status options for defect summary
  const statusOptions = [
    { value: 'noGood', symbol: '❌', label: 'No Good' },
    { value: 'corrected', symbol: 'ⓧ', label: 'Corrected' },
  ];

  const defectCodeOptions = [
    { value: 'functional_safety', symbol: '■XX', label: 'FUNCTIONAL DEFECT/DEFECT RELATED TO SAFETY/DEFECT NOT SATISFYING THE DRAWING/DEFECT RELATED TO REGULATIONS' },
    { value: 'functional_other', symbol: '■X', label: 'FUNCTIONAL DEFECT DOES NOT MENTIONED ABOVE' },
    { value: 'sensory_major', symbol: '□XX', label: 'SENSORY/APPEARANCE DEFECT EVALUATION - MAJOR' },
    { value: 'sensory_minor', symbol: '□X', label: 'SENSORY/APPEARANCE DEFECT EVALUATION - MINOR' },
  ];

  return (
    <div className="card bg-base-200 shadow-md p-4 md:p-6">
      <h4 className="text-lg font-semibold mb-4 text-info">Summary Checklist</h4>
      
      {/* Legends Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Defect Code Legend */}
          <div className="bg-base-100 p-4 rounded-lg shadow-sm">
            <h5 className="text-md font-semibold mb-3 text-primary">Defect Code Legend</h5>
            <div className="space-y-2">
              {defectCodeOptions.map((option) => (
                <div key={option.value} className="flex items-start gap-3">
                  <span className="text-lg font-bold text-secondary">{option.symbol}</span>
                  <span className="text-sm leading-tight">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Status Legend */}
          <div className="bg-base-100 p-4 rounded-lg shadow-sm">
            <h5 className="text-md font-semibold mb-3 text-primary">Status Legend</h5>
            <div className="space-y-2">
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-secondary">{option.symbol}</span>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table w-full border min-w-200">
          <thead>
            <tr>
              <th className="text-center">No.</th>
              <th className="text-center">Defect Code</th>
              <th className="text-center">Defect Encountered</th>
              <th className="text-center">Status</th>
              <th className="text-center">Image</th>
              <th className="text-center">Recurrence</th>
            </tr>
          </thead>
          <tbody>
            {defects.map((defect, idx) => (
              <tr key={idx}>
                <td className="text-center">{defect.no}</td>
                <td className="text-center">
                  <div className="flex gap-2 flex-wrap justify-center">
                    {defectCodeOptions.map((option) => (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`defectCode-${idx}`}
                          value={option.value}
                          checked={defect.defectCode === option.value}
                          onChange={(e) => updateDefect(idx, 'defectCode', e.target.value)}
                          className="radio radio-primary hidden"
                        />
                        <span className={`btn btn-xs ${defect.defectCode === option.value ? 'btn-primary' : 'btn-outline'}`}>
                          {option.symbol}
                        </span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="text-center">
                  <input
                    type="text"
                    value={defect.defectEncountered}
                    onChange={(e) => updateDefect(idx, 'defectEncountered', e.target.value)}
                    className="input input-bordered w-full"
                    placeholder="Describe defect"
                  />
                </td>
                <td className="text-center">
                  <div className="flex gap-2 justify-center">
                    {statusOptions.map((option) => (
                      <label key={option.value} className="cursor-pointer">
                        <input
                          type="radio"
                          name={`status-${idx}`}
                          value={option.value}
                          checked={defect.status === option.value}
                          onChange={(e) => updateDefect(idx, 'status', e.target.value)}
                          className="radio radio-primary hidden"
                        />
                        <span className={`btn btn-xs ${defect.status === option.value ? 'btn-primary' : 'btn-outline'}`}>
                          {option.symbol}
                        </span>
                      </label>
                    ))}
                  </div>
                </td>
                <td className="text-center">
                  <input
                    type="file"
                    accept="image/*" // ✅ Changed to accept all images
                    onChange={(e) => updateDefect(idx, 'image', e.target.files[0])}
                    className="file-input file-input-bordered file-input-primary w-full mb-2"
                  />
                  {/* ✅ Fixed: Display as clickable thumbnail with preview */}
                  {defect.image ? (
                    defect.image instanceof File ? (
                      <img
                        src={URL.createObjectURL(defect.image)}
                        alt="Defect"
                        className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform mx-auto"
                        onClick={() => openPreview(URL.createObjectURL(defect.image))}
                      />
                    ) : (
                      // For existing images (e.g., from backend)
                      <img
                        src={defect.image}
                        alt="Defect"
                        className="w-12 h-12 object-cover rounded cursor-pointer hover:scale-105 transition-transform mx-auto"
                        onClick={() => openPreview(defect.image)}
                      />
                    )
                  ) : (
                    <span className="text-gray-400 text-sm">No Image</span>
                  )}
                  {/* ✅ Added helper text below the input */}
                  <p className="text-xs text-gray-500 mt-1">Max 20MB, Any Image Format.</p>
                </td>
                <td className="text-center">
                  <input
                    type="number"
                    value={defect.recurrence}
                    onChange={(e) => updateDefect(idx, 'recurrence', parseInt(e.target.value) || 0)}
                    className="input input-bordered w-full"
                    min="0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Image Preview Modal */}
      {isPreviewOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">Image Preview</h3>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="w-full h-auto max-h-96 object-contain rounded-lg" 
            />
            <div className="modal-action">
              <button className="btn" onClick={closePreview}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Buttons */}
      <div className="mt-4 flex flex-col md:flex-row gap-2 justify-end">
        <button className="btn btn-primary w-full md:w-auto" onClick={addDefect}>Add Defect</button>
        <button className="btn btn-success w-full md:w-auto" onClick={() => onSave(defects)}>Save Summary Checklist</button>
      </div>
    </div>
  );
};

export default SummaryChecklist;