import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, Download, Trash2, X, Upload, Check } from 'lucide-react'; // ✅ Added icons for buttons (Eye for view, Download for download, Trash2 for delete, X for close/cancel, Upload for upload, Check for confirm)

const API_BASE_URL = 'http://localhost:5000'; // Adjust as needed

const Manual = () => {
  const [manuals, setManuals] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);
  const [viewingManual, setViewingManual] = useState(null);
  // ✅ New states for confirmation modals
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [manualToDelete, setManualToDelete] = useState(null);

  // Fetch manuals
  const fetchManuals = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/manual`);
      setManuals(response.data.manuals || []);
    } catch (err) {
      console.log('Error fetching manuals:', err.message);
      setManuals([]);
    }
  };

  useEffect(() => {
    fetchManuals().finally(() => setFetching(false));
  }, []);

  // Handle file selection and show upload confirmation modal
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    setSelectedFile(file);
    setShowUploadConfirm(true);
    setError(null);
  };

  // Confirm and upload
  const confirmUpload = async () => {
    setShowUploadConfirm(false);
    setUploading(true);

    const formData = new FormData();
    formData.append('manual', selectedFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/manual/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setManuals(prev => [response.data.manual, ...prev]);
      console.log('Manual uploaded successfully!');
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

  // Handle delete and show confirmation modal
  const handleDeleteClick = (manual) => {
    setManualToDelete(manual);
    setShowDeleteConfirm(true);
  };

  // Confirm and delete
  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    try {
      await axios.delete(`${API_BASE_URL}/api/manual/${manualToDelete.id}`);
      setManuals(prev => prev.filter(m => m.id !== manualToDelete.id));
      console.log('Manual deleted successfully!');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner text-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Manuals</h1>

      {/* Upload Section */}
      <div className="card bg-base-200 shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Upload Manual (PDF)</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="file-input file-input-bordered file-input-primary w-full"
          disabled={uploading}
        />
        {uploading && <p className="text-info mt-2">Uploading...</p>}
        {error && <p className="text-error mt-2">{error}</p>}
      </div>

      {/* Manuals List */}
      {manuals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {manuals.map((manual) => (
            <div key={manual.id} className="card bg-base-200 shadow-md p-4">
              <h3 className="text-lg font-semibold mb-2">{manual.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Uploaded: {new Date(manual.uploadedAt).toLocaleDateString()}</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setViewingManual(manual)}
                >
                  <Eye size={16} className="mr-1" /> View
                </button>
                <a
                  href={`${API_BASE_URL}${manual.url}`}
                  download={manual.name}
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={16} className="mr-1" /> Download
                </a>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => handleDeleteClick(manual)}
                >
                  <Trash2 size={16} className="mr-1" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card bg-base-200 shadow-md p-4">
          <p className="text-gray-500">No manuals uploaded yet. Please upload a PDF above.</p>
        </div>
      )}

      {/* View Modal */}
      {viewingManual && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-lg mb-4">{viewingManual.name}</h3>
            <iframe
              src={`${API_BASE_URL}${viewingManual.url}`}
              width="100%"
              height="500px"
              className="border rounded"
              title={viewingManual.name}
            ></iframe>
            <div className="modal-action">
              <button className="btn" onClick={() => setViewingManual(null)}>
                <X size={16} className="mr-1" /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Upload Confirmation Modal */}
      {showUploadConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirm Upload</h3>
            <p className="py-4">Are you sure you want to upload "{selectedFile?.name}"? This will save it to the manuals list.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={cancelUpload}>
                <X size={16} className="mr-1" /> Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmUpload}>
                <Upload size={16} className="mr-1" /> Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirm Deletion</h3>
            <p className="py-4">Are you sure you want to delete "{manualToDelete?.name}"? This action cannot be undone.</p>
            <div className="modal-action">
              <button className="btn btn-ghost" onClick={cancelDelete}>
                <X size={16} className="mr-1" /> Cancel
              </button>
              <button className="btn btn-error" onClick={confirmDelete}>
                <Trash2 size={16} className="mr-1" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manual;