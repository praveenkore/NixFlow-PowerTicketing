/**
 * Form List Component - Admin interface for managing forms
 */

import React, { useState, useEffect } from 'react';
import { CustomFormDefinition } from '../types/form.types';
import { FormStatus, Category } from '../types/enums';

interface FormListProps {
  onCreateForm?: () => void;
  onEditForm?: (formId: number) => void;
  onViewSubmissions?: (formId: number) => void;
  onViewAnalytics?: (formId: number) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const FormList: React.FC<FormListProps> = ({
  onCreateForm,
  onEditForm,
  onViewSubmissions,
  onViewAnalytics,
}) => {
  const [forms, setForms] = useState<CustomFormDefinition[]>([]);
  const [templates, setTemplates] = useState<CustomFormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'forms' | 'templates'>('forms');
  const [filterStatus, setFilterStatus] = useState<FormStatus | ''>('');
  const [filterCategory, setFilterCategory] = useState<Category | ''>('');

  useEffect(() => {
    fetchForms();
    fetchTemplates();
  }, []);

  const fetchForms = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('isTemplate', 'false');
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);

      const response = await fetch(`${API_URL}/api/forms?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch forms');
      }

      const data = await response.json();
      setForms(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/forms/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const handleDelete = async (formId: number) => {
    if (!confirm('Are you sure you want to delete this form?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/forms/${formId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to delete form');
      }

      fetchForms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClone = async (formId: number, formName: string) => {
    const newName = prompt('Enter name for the cloned form:', `${formName} (Copy)`);
    if (!newName) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/forms/${formId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      });

      if (!response.ok) {
        throw new Error('Failed to clone form');
      }

      fetchForms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePublishToggle = async (form: CustomFormDefinition) => {
    const newStatus = form.status === FormStatus.Published ? FormStatus.Draft : FormStatus.Published;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/forms/${form.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update form status');
      }

      fetchForms();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadgeClass = (status: FormStatus) => {
    switch (status) {
      case FormStatus.Published:
        return 'badge-success';
      case FormStatus.Draft:
        return 'badge-warning';
      case FormStatus.Archived:
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  const filteredForms = forms.filter(form => {
    if (filterStatus && form.status !== filterStatus) return false;
    if (filterCategory && form.category !== filterCategory) return false;
    return true;
  });

  return (
    <div className="form-list">
      <div className="form-list-header">
        <h2>Web Forms</h2>
        <button className="btn-primary" onClick={onCreateForm}>
          + Create New Form
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="form-list-tabs">
        <button
          className={activeTab === 'forms' ? 'active' : ''}
          onClick={() => setActiveTab('forms')}
        >
          My Forms
        </button>
        <button
          className={activeTab === 'templates' ? 'active' : ''}
          onClick={() => setActiveTab('templates')}
        >
          Templates ({templates.length})
        </button>
      </div>

      {activeTab === 'forms' && (
        <>
          <div className="form-filters">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FormStatus)}
            >
              <option value="">All Statuses</option>
              {Object.values(FormStatus).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as Category)}
            >
              <option value="">All Categories</option>
              {Object.values(Category).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button className="btn-secondary" onClick={fetchForms}>
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading forms...</p>
            </div>
          ) : filteredForms.length === 0 ? (
            <div className="empty-state">
              <p>No forms found</p>
              <button className="btn-primary" onClick={onCreateForm}>
                Create your first form
              </button>
            </div>
          ) : (
            <div className="forms-table-container">
              <table className="forms-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Fields</th>
                    <th>Public URL</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredForms.map((form) => (
                    <tr key={form.id}>
                      <td>
                        <div className="form-name">
                          <strong>{form.name}</strong>
                          {form.description && (
                            <p className="form-description">{form.description}</p>
                          )}
                        </div>
                      </td>
                      <td>{form.category}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(form.status)}`}>
                          {form.status}
                        </span>
                      </td>
                      <td>{form.fields.length}</td>
                      <td>
                        {form.status === FormStatus.Published ? (
                          <code className="public-url">/forms/{form.slug}</code>
                        ) : (
                          <span className="text-muted">Not published</span>
                        )}
                      </td>
                      <td>{form.createdAt ? new Date(form.createdAt).toLocaleDateString() : '-'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon"
                            title="Edit"
                            onClick={() => onEditForm?.(form.id!)}
                          >
                            ✎
                          </button>
                          <button
                            className="btn-icon"
                            title="View Submissions"
                            onClick={() => onViewSubmissions?.(form.id!)}
                          >
                            📋
                          </button>
                          <button
                            className="btn-icon"
                            title="Analytics"
                            onClick={() => onViewAnalytics?.(form.id!)}
                          >
                            📊
                          </button>
                          <button
                            className={`btn-icon ${form.status === FormStatus.Published ? 'btn-warning' : 'btn-success'}`}
                            title={form.status === FormStatus.Published ? 'Unpublish' : 'Publish'}
                            onClick={() => handlePublishToggle(form)}
                          >
                            {form.status === FormStatus.Published ? '⏸' : '▶'}
                          </button>
                          <button
                            className="btn-icon"
                            title="Clone"
                            onClick={() => handleClone(form.id!, form.name)}
                          >
                            📄
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            title="Delete"
                            onClick={() => handleDelete(form.id!)}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {activeTab === 'templates' && (
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h4>{template.name}</h4>
                <span className="template-category">{template.templateCategory}</span>
              </div>
              {template.description && (
                <p className="template-description">{template.description}</p>
              )}
              <div className="template-meta">
                <span>{template.fields.length} fields</span>
                <span>{template.category}</span>
              </div>
              <button
                className="btn-primary btn-small"
                onClick={() => handleClone(template.id!, template.name)}
              >
                Use Template
              </button>
            </div>
          ))}
          {templates.length === 0 && (
            <div className="empty-state">
              <p>No templates available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormList;
