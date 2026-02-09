/**
 * Form Submissions Component - Manage form submissions and convert to tickets
 */

import React, { useState, useEffect } from 'react';
import { FormSubmissionRecord, FormSubmissionStatus } from '../types/form.types';

interface FormSubmissionsProps {
  formId?: number;
  onBack?: () => void;
  onViewTicket?: (ticketId: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const FormSubmissions: React.FC<FormSubmissionsProps> = ({
  formId,
  onBack,
  onViewTicket,
}) => {
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FormSubmissionStatus | ''>('');
  const [converting, setConverting] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionRecord | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [formId, filterStatus]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (formId) params.append('formId', formId.toString());
      if (filterStatus) params.append('status', filterStatus);

      const response = await fetch(`${API_URL}/api/form-submissions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async (submissionId: number) => {
    setConverting(submissionId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/form-submissions/${submissionId}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to convert submission');
      }

      const result = await response.json();
      
      // Update the submission in the list
      setSubmissions(prev =>
        prev.map(sub =>
          sub.id === submissionId
            ? { ...sub, status: FormSubmissionStatus.Converted, ticketId: result.ticketId }
            : sub
        )
      );

      // Show success message or redirect to ticket
      if (confirm(`Ticket ${result.ticketNumber} created successfully. View ticket?`)) {
        onViewTicket?.(result.ticketId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConverting(null);
    }
  };

  const getStatusBadgeClass = (status: FormSubmissionStatus) => {
    switch (status) {
      case FormSubmissionStatus.Converted:
        return 'badge-success';
      case FormSubmissionStatus.Pending:
        return 'badge-warning';
      case FormSubmissionStatus.Processing:
        return 'badge-info';
      case FormSubmissionStatus.Failed:
        return 'badge-danger';
      default:
        return 'badge-secondary';
    }
  };

  const formatDataPreview = (data: Record<string, any>): string => {
    const entries = Object.entries(data).slice(0, 3);
    const preview = entries.map(([key, value]) => {
      let displayValue = value;
      if (Array.isArray(value)) {
        displayValue = value.join(', ');
      }
      return `${key}: ${String(displayValue).substring(0, 30)}`;
    }).join(' | ');
    
    return preview + (Object.keys(data).length > 3 ? '...' : '');
  };

  return (
    <div className="form-submissions">
      <div className="submissions-header">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <h2>Form Submissions</h2>
        <button className="btn-secondary" onClick={fetchSubmissions}>
          Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="submissions-filters">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FormSubmissionStatus)}
        >
          <option value="">All Statuses</option>
          {Object.values(FormSubmissionStatus).map(status => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="empty-state">
          <p>No submissions found</p>
        </div>
      ) : (
        <div className="submissions-table-container">
          <table className="submissions-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Form</th>
                <th>Submitted By</th>
                <th>Data Preview</th>
                <th>Status</th>
                <th>Submitted At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((submission) => (
                <tr key={submission.id}>
                  <td>#{submission.id}</td>
                  <td>{submission.formName}</td>
                  <td>
                    {submission.submitterName || submission.submitterEmail || 'Anonymous'}
                  </td>
                  <td className="data-preview">
                    {formatDataPreview(submission.data)}
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(submission.status)}`}>
                      {submission.status}
                    </span>
                    {submission.ticketId && (
                      <span className="badge badge-info">Ticket #{submission.ticketId}</span>
                    )}
                  </td>
                  <td>{new Date(submission.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="View Details"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        👁
                      </button>
                      {submission.status !== FormSubmissionStatus.Converted && (
                        <button
                          className="btn-icon btn-success"
                          title="Convert to Ticket"
                          onClick={() => handleConvert(submission.id)}
                          disabled={converting === submission.id}
                        >
                          {converting === submission.id ? '⏳' : '🎫'}
                        </button>
                      )}
                      {submission.ticketId && (
                        <button
                          className="btn-icon"
                          title="View Ticket"
                          onClick={() => onViewTicket?.(submission.ticketId!)}
                        >
                          🔗
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <div className="modal-overlay" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submission #{selectedSubmission.id}</h3>
              <button className="btn-close" onClick={() => setSelectedSubmission(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="submission-details">
                <div className="detail-row">
                  <label>Form:</label>
                  <span>{selectedSubmission.formName}</span>
                </div>
                <div className="detail-row">
                  <label>Submitted By:</label>
                  <span>
                    {selectedSubmission.submitterName || 'Anonymous'}
                    {selectedSubmission.submitterEmail && (
                      <span className="text-muted"> ({selectedSubmission.submitterEmail})</span>
                    )}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Status:</label>
                  <span className={`badge ${getStatusBadgeClass(selectedSubmission.status)}`}>
                    {selectedSubmission.status}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Submitted At:</label>
                  <span>{new Date(selectedSubmission.createdAt).toLocaleString()}</span>
                </div>
                {selectedSubmission.ticketId && (
                  <div className="detail-row">
                    <label>Ticket:</label>
                    <button
                      className="btn-link"
                      onClick={() => onViewTicket?.(selectedSubmission.ticketId!)}
                    >
                      View Ticket #{selectedSubmission.ticketId}
                    </button>
                  </div>
                )}

                <div className="submission-data">
                  <h4>Submitted Data</h4>
                  <div className="data-table">
                    {Object.entries(selectedSubmission.data).map(([key, value]) => (
                      <div key={key} className="data-row">
                        <div className="data-key">{key}</div>
                        <div className="data-value">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedSubmission.status !== FormSubmissionStatus.Converted && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    handleConvert(selectedSubmission.id);
                    setSelectedSubmission(null);
                  }}
                  disabled={converting === selectedSubmission.id}
                >
                  {converting === selectedSubmission.id ? 'Converting...' : 'Convert to Ticket'}
                </button>
              )}
              <button className="btn-secondary" onClick={() => setSelectedSubmission(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormSubmissions;
