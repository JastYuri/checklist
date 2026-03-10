import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { Eye, Download, Trash2, X, Upload, Check, FileText, AlertCircle } from 'lucide-react';

// Extract base URL from axiosInstance for file access
const API_BASE_URL = axiosInstance.defaults.baseURL.replace('/api', '');

const Manual = () => {
  const [manuals, setManuals] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [viewingManual, setViewingManual] = useState(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manualToDelete, setManualToDelete] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Fetch manuals
  const fetchManuals = async () => {
    try {
      // ✅ Use axiosInstance instead of axios
      const response = await axiosInstance.get("/manual");
      setManuals(response.data.manuals || []);
    } catch (err) {
      // Production: removed error log
      setManuals([]);
    }
  };

  useEffect(() => {
    fetchManuals().finally(() => setFetching(false));
  }, []);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setSelectedFile(file);
    setShowUploadConfirm(true);
    setError(null);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  // Confirm and upload
  const confirmUpload = async () => {
    setShowUploadConfirm(false);
    setUploading(true);

    const formData = new FormData();
    formData.append('manual', selectedFile);

    try {
      // ✅ Use axiosInstance
      const response = await axiosInstance.post("/manual/upload", formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setManuals(prev => [response.data.manual, ...prev]);
      // Production: removed success log
    } catch (err) {
      setError('Failed to upload manual: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  // Cancel upload
  const cancelUpload = () => {
    setShowUploadConfirm(false);
    setSelectedFile(null);
  };

  // Handle delete
  const handleDeleteClick = (manual) => {
    setManualToDelete(manual);
    setShowDeleteConfirm(true);
  };

  // Confirm and delete
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      // ✅ Use axiosInstance
      await axiosInstance.delete(`/manual/${manualToDelete.id}`);
      setManuals(prev => prev.filter(m => m.id !== manualToDelete.id));
      // Production: removed success log
    } catch (err) {
      setError('Failed to delete manual: ' + (err.response?.data?.message || err.message));
    } finally {
      setManualToDelete(null);
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setManualToDelete(null);
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear from-base-200 to-base-300">
        <div className="text-center">
          <div className="loading loading-spinner text-primary text-6xl mb-4"></div>
          <p className="text-lg text-base-content/70">Loading manuals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear from-base-100 to-base-200 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-base-900 mb-2">Manuals</h1>
          <p className="text-base-600 text-lg">Upload, view, and manage your documentation</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error shadow-md mb-8 border-l-4 border-error">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="btn btn-ghost btn-sm">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Upload Section */}
        <div className="card bg-linear from-primary/5 to-primary/10 shadow-lg border border-primary/20 p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Upload className="text-primary" size={28} />
            Upload New Manual
          </h2>
          
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 md:p-12 transition-all duration-200 cursor-pointer ${
              dragActive
                ? 'border-primary bg-primary/10 scale-105'
                : 'border-primary/30 hover:border-primary/60'
            }`}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-4 bg-primary/20 rounded-full">
                  <FileText size={40} className="text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-base-900">Drop your PDF here</h3>
              <p className="text-base-600 mb-4">or click to browse from your computer</p>
              <p className="text-sm text-base-500">Supported format: PDF (Max 50MB)</p>
            </div>
          </div>

          {uploading && (
            <div className="mt-6">
              <p className="text-info font-medium mb-2">📤 Uploading your manual...</p>
              <progress className="progress progress-primary w-full"></progress>
            </div>
          )}
        </div>

        {/* Manuals List */}
        {manuals.length > 0 ? (
          <div>
            <h3 className="text-2xl font-bold mb-6 text-base-900">Your Manuals ({manuals.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {manuals.map((manual) => (
                <div key={manual.id} className="card bg-base-100 shadow-md hover:shadow-xl transition-shadow duration-200 border border-base-200 overflow-hidden group hover:border-primary/30">
                  <div className="card-body">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="text-primary" size={24} />
                      </div>
                      <h3 className="text-lg font-bold flex-1 line-clamp-2 group-hover:text-primary transition-colors">{manual.name}</h3>
                    </div>
                    
                    <p className="text-sm text-base-500 mb-4">
                      📅 {new Date(manual.uploadedAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    
                    <div className="divider my-2"></div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className="btn btn-primary btn-sm flex-1 gap-1"
                        onClick={() => setViewingManual(manual)}
                      >
                        <Eye size={16} /> View
                      </button>
                      <a
                        href={`${API_BASE_URL}${manual.url}`}
                        download={manual.name}
                        className="btn btn-secondary btn-sm flex-1 gap-1"
                      >
                        <Download size={16} /> Download
                      </a>
                      <button
                        className="btn btn-error btn-sm"
                        onClick={() => handleDeleteClick(manual)}
                        title="Delete manual"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card bg-base-100 shadow-md border border-base-300 p-12">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className="p-6 bg-base-200 rounded-full">
                  <FileText size={48} className="text-base-400" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-base-900 mb-2">No Manuals Yet</h3>
              <p className="text-base-600">Upload your first manual above to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingManual && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
              <FileText className="text-primary" size={28} />
              {viewingManual.name}
            </h3>
            <div className="bg-base-200 rounded-lg overflow-hidden">
              <iframe
                src={`${API_BASE_URL}${viewingManual.url}`}
                width="100%"
                height="600px"
                className="border-0"
                title={viewingManual.name}
              ></iframe>
            </div>
            <div className="modal-action mt-6">
              <button 
                className="btn btn-ghost btn-lg gap-2"
                onClick={() => setViewingManual(null)}
              >
                <X size={20} /> Close
              </button>
              <a
                href={`${API_BASE_URL}${viewingManual.url}`}
                download={viewingManual.name}
                className="btn btn-primary btn-lg gap-2"
              >
                <Download size={20} /> Download
              </a>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setViewingManual(null)}>close</button>
          </form>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {showUploadConfirm && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <Upload className="text-primary" size={24} />
              Confirm Upload
            </h3>
            <div className="bg-base-200 p-4 rounded-lg mb-6">
              <p className="text-base-content">
                Ready to upload: <span className="font-semibold text-primary">{selectedFile?.name}</span>
              </p>
              <p className="text-sm text-base-500 mt-2">
                Size: {(selectedFile?.size / 1024).toFixed(2)} KB
              </p>
            </div>
            <p className="py-4 text-base-700">This will be added to your manuals list.</p>
            <div className="modal-action">
              <button className="btn btn-ghost gap-2" onClick={cancelUpload}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-primary gap-2" onClick={confirmUpload}>
                <Check size={16} /> Upload
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelUpload}>close</button>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal modal-open modal-bottom sm:modal-middle">
          <div className="modal-box">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
              <AlertCircle className="text-error" size={24} />
              Confirm Deletion
            </h3>
            <div className="bg-error/10 border border-error/20 p-4 rounded-lg mb-6">
              <p className="text-base-content">
                Delete: <span className="font-semibold text-error">{manualToDelete?.name}</span>
              </p>
            </div>
            <p className="py-4 text-base-700">
              ⚠️ This action cannot be undone. The manual will be permanently removed.
            </p>
            <div className="modal-action">
              <button className="btn btn-ghost gap-2" onClick={cancelDelete}>
                <X size={16} /> Cancel
              </button>
              <button className="btn btn-error gap-2" onClick={confirmDelete}>
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={cancelDelete}>close</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Manual;