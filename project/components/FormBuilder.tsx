/**
 * Form Builder Component - Admin interface for creating and editing forms
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AVAILABLE_FIELD_TYPES, FormFieldDefinition, CustomFormDefinition, FormCreateRequest } from '../types/form.types';
import { Category, Priority, FormStatus, FormFieldType } from '../types/enums';

interface FormBuilderProps {
  formId?: number;
  onSave?: (form: CustomFormDefinition) => void;
  onCancel?: () => void;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const FormBuilder: React.FC<FormBuilderProps> = ({ formId, onSave, onCancel }) => {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>(Category.GeneralInquiry);
  const [defaultPriority, setDefaultPriority] = useState<Priority>(Priority.Medium);
  const [defaultAssigneeId, setDefaultAssigneeId] = useState<number | undefined>();
  const [successMessage, setSuccessMessage] = useState('Thank you for your submission. We will get back to you soon.');
  const [submitButtonText, setSubmitButtonText] = useState('Submit');
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'fields' | 'settings'>('fields');

  // Fetch users and existing form data
  useEffect(() => {
    fetchUsers();
    if (formId) {
      fetchForm();
    }
  }, [formId]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchForm = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/forms/${formId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load form');
      }
      
      const form: CustomFormDefinition = await response.json();
      setName(form.name);
      setDescription(form.description || '');
      setCategory(form.category);
      setDefaultPriority(form.defaultPriority);
      setDefaultAssigneeId(form.defaultAssigneeId);
      setSuccessMessage(form.successMessage || '');
      setSubmitButtonText(form.submitButtonText || 'Submit');
      setAllowAnonymous(form.allowAnonymous || false);
      setFields(form.fields);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add a new field
  const addField = (fieldType: FormFieldType) => {
    const fieldTypeMeta = AVAILABLE_FIELD_TYPES.find(t => t.type === fieldType);
    if (!fieldTypeMeta) return;

    const newField: FormFieldDefinition = {
      name: `field_${Date.now()}`,
      label: fieldTypeMeta.label,
      type: fieldType,
      order: fields.length,
      config: fieldTypeMeta.defaultConfig,
      width: 'full',
      validation: {},
    };

    setFields([...fields, newField]);
    setSelectedFieldIndex(fields.length);
  };

  // Update a field
  const updateField = (index: number, updates: Partial<FormFieldDefinition>) => {
    const updatedFields = [...fields];
    updatedFields[index] = { ...updatedFields[index], ...updates };
    setFields(updatedFields);
  };

  // Remove a field
  const removeField = (index: number) => {
    const updatedFields = fields.filter((_, i) => i !== index);
    // Reorder remaining fields
    updatedFields.forEach((field, i) => field.order = i);
    setFields(updatedFields);
    if (selectedFieldIndex === index) {
      setSelectedFieldIndex(null);
    } else if (selectedFieldIndex !== null && selectedFieldIndex > index) {
      setSelectedFieldIndex(selectedFieldIndex - 1);
    }
  };

  // Move field up/down
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const updatedFields = [...fields];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    [updatedFields[index], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[index]];
    updatedFields.forEach((field, i) => field.order = i);
    
    setFields(updatedFields);
    setSelectedFieldIndex(newIndex);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('fieldIndex', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('fieldIndex'));
    
    if (dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const updatedFields = [...fields];
    const [removed] = updatedFields.splice(dragIndex, 1);
    updatedFields.splice(dropIndex, 0, removed);
    updatedFields.forEach((field, i) => field.order = i);
    
    setFields(updatedFields);
    setDragOverIndex(null);
    setSelectedFieldIndex(dropIndex);
  };

  // Save form
  const handleSave = async (publish = false) => {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const formData: FormCreateRequest = {
        name,
        description,
        category,
        defaultPriority,
        defaultAssigneeId,
        fields: fields.map((f, i) => ({ ...f, order: i })),
        successMessage,
        submitButtonText,
        allowAnonymous,
      };

      const url = formId 
        ? `${API_URL}/api/forms/${formId}`
        : `${API_URL}/api/forms`;
      
      const method = formId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save form');
      }

      let savedForm = await response.json();

      // Publish if requested
      if (publish && formId) {
        const publishResponse = await fetch(`${API_URL}/api/forms/${formId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: FormStatus.Published }),
        });

        if (!publishResponse.ok) {
          throw new Error('Form saved but failed to publish');
        }
        savedForm = await publishResponse.json();
      }

      onSave?.(savedForm);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="form-builder-loading">
        <div className="spinner"></div>
        <p>Loading form...</p>
      </div>
    );
  }

  return (
    <div className="form-builder">
      {/* Header */}
      <div className="form-builder-header">
        <h2>{formId ? 'Edit Form' : 'Create New Form'}</h2>
        <div className="form-builder-actions">
          <button className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button className="btn-success" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="form-builder-tabs">
        <button
          className={activeTab === 'fields' ? 'active' : ''}
          onClick={() => setActiveTab('fields')}
        >
          Form Fields
        </button>
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
      </div>

      <div className="form-builder-content">
        {activeTab === 'fields' ? (
          <>
            {/* Field Palette */}
            <div className="field-palette">
              <h3>Add Fields</h3>
              <div className="field-types">
                {AVAILABLE_FIELD_TYPES.map((fieldType) => (
                  <button
                    key={fieldType.type}
                    className="field-type-btn"
                    onClick={() => addField(fieldType.type)}
                    title={fieldType.description}
                  >
                    <span className={`icon icon-${fieldType.icon}`}></span>
                    <span>{fieldType.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Canvas */}
            <div className="form-canvas">
              <h3>Form Layout</h3>
              {fields.length === 0 ? (
                <div className="empty-canvas">
                  <p>Click on field types to add them to your form</p>
                </div>
              ) : (
                <div className="form-fields">
                  {fields.map((field, index) => (
                    <div
                      key={`${field.name}-${index}`}
                      className={`form-field-item ${selectedFieldIndex === index ? 'selected' : ''} ${dragOverIndex === index ? 'drag-over' : ''} width-${field.width}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      onClick={() => setSelectedFieldIndex(index)}
                    >
                      <div className="field-drag-handle">⋮⋮</div>
                      <div className="field-info">
                        <span className="field-label">{field.label}</span>
                        <span className="field-type">{field.type}</span>
                        {field.validation?.required && <span className="required-badge">*</span>}
                      </div>
                      <div className="field-actions">
                        <button onClick={() => moveField(index, 'up')} disabled={index === 0}>↑</button>
                        <button onClick={() => moveField(index, 'down')} disabled={index === fields.length - 1}>↓</button>
                        <button onClick={() => removeField(index)} className="btn-danger">×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Field Editor */}
            {selectedFieldIndex !== null && fields[selectedFieldIndex] && (
              <div className="field-editor">
                <h3>Edit Field</h3>
                <FieldEditor
                  field={fields[selectedFieldIndex]}
                  onChange={(updates) => updateField(selectedFieldIndex, updates)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="form-settings">
            <div className="form-group">
              <label>Form Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter form name"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter form description"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Ticket Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                  {Object.values(Category).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Default Priority</label>
                <select value={defaultPriority} onChange={(e) => setDefaultPriority(e.target.value as Priority)}>
                  {Object.values(Priority).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Default Assignee</label>
              <select
                value={defaultAssigneeId || ''}
                onChange={(e) => setDefaultAssigneeId(e.target.value ? parseInt(e.target.value) : undefined)}
              >
                <option value="">-- Auto-assign (Round Robin) --</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Success Message</label>
              <textarea
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                placeholder="Message shown after successful submission"
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>Submit Button Text</label>
              <input
                type="text"
                value={submitButtonText}
                onChange={(e) => setSubmitButtonText(e.target.value)}
                placeholder="Submit"
              />
            </div>

            <div className="form-check">
              <input
                type="checkbox"
                id="allowAnonymous"
                checked={allowAnonymous}
                onChange={(e) => setAllowAnonymous(e.target.checked)}
              />
              <label htmlFor="allowAnonymous">
                Allow anonymous submissions (no login required)
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Field Editor Component
interface FieldEditorProps {
  field: FormFieldDefinition;
  onChange: (updates: Partial<FormFieldDefinition>) => void;
}

const FieldEditor: React.FC<FieldEditorProps> = ({ field, onChange }) => {
  const fieldTypeMeta = AVAILABLE_FIELD_TYPES.find(t => t.type === field.type);

  const addOption = () => {
    const options = [...(field.options || [])];
    options.push({ label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` });
    onChange({ options });
  };

  const updateOption = (index: number, updates: { label?: string; value?: string }) => {
    const options = [...(field.options || [])];
    options[index] = { ...options[index], ...updates };
    onChange({ options });
  };

  const removeOption = (index: number) => {
    const options = (field.options || []).filter((_, i) => i !== index);
    onChange({ options });
  };

  return (
    <div className="field-editor-content">
      <div className="form-group">
        <label>Field Label *</label>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Enter field label"
        />
      </div>

      <div className="form-group">
        <label>Field Name (ID) *</label>
        <input
          type="text"
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value.replace(/\s+/g, '_').toLowerCase() })}
          placeholder="field_name"
        />
      </div>

      <div className="form-group">
        <label>Placeholder</label>
        <input
          type="text"
          value={field.placeholder || ''}
          onChange={(e) => onChange({ placeholder: e.target.value })}
          placeholder="Enter placeholder text"
        />
      </div>

      <div className="form-group">
        <label>Help Text</label>
        <input
          type="text"
          value={field.helpText || ''}
          onChange={(e) => onChange({ helpText: e.target.value })}
          placeholder="Additional instructions for users"
        />
      </div>

      <div className="form-group">
        <label>Field Width</label>
        <select value={field.width || 'full'} onChange={(e) => onChange({ width: e.target.value as any })}>
          <option value="full">Full Width</option>
          <option value="half">Half Width</option>
          <option value="third">Third Width</option>
          <option value="quarter">Quarter Width</option>
        </select>
      </div>

      <div className="form-group">
        <label>Default Value</label>
        <input
          type="text"
          value={field.defaultValue || ''}
          onChange={(e) => onChange({ defaultValue: e.target.value })}
          placeholder="Default value"
        />
      </div>

      <div className="form-group">
        <label>Maps to Ticket Field</label>
        <select
          value={field.mapsToTicketField || ''}
          onChange={(e) => onChange({ mapsToTicketField: e.target.value || undefined })}
        >
          <option value="">-- None --</option>
          <option value="title">Ticket Title</option>
          <option value="description">Ticket Description</option>
        </select>
      </div>

      {/* Validation Section */}
      <div className="field-section">
        <h4>Validation</h4>
        <div className="form-check">
          <input
            type="checkbox"
            id="required"
            checked={field.validation?.required || false}
            onChange={(e) => onChange({
              validation: { ...field.validation, required: e.target.checked }
            })}
          />
          <label htmlFor="required">Required</label>
        </div>

        {fieldTypeMeta?.supportsValidation && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Min Length</label>
                <input
                  type="number"
                  value={field.validation?.minLength || ''}
                  onChange={(e) => onChange({
                    validation: { ...field.validation, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                />
              </div>
              <div className="form-group">
                <label>Max Length</label>
                <input
                  type="number"
                  value={field.validation?.maxLength || ''}
                  onChange={(e) => onChange({
                    validation: { ...field.validation, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                  })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Custom Error Message</label>
              <input
                type="text"
                value={field.validation?.customErrorMessage || ''}
                onChange={(e) => onChange({
                  validation: { ...field.validation, customErrorMessage: e.target.value }
                })}
                placeholder="Custom error message"
              />
            </div>
          </>
        )}
      </div>

      {/* Options Section (for select, checkbox, radio) */}
      {fieldTypeMeta?.supportsOptions && (
        <div className="field-section">
          <h4>Options</h4>
          {(field.options || []).map((option, index) => (
            <div key={index} className="option-row">
              <input
                type="text"
                value={option.label}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                placeholder="Label"
              />
              <input
                type="text"
                value={option.value}
                onChange={(e) => updateOption(index, { value: e.target.value })}
                placeholder="Value"
              />
              <button onClick={() => removeOption(index)} className="btn-danger">×</button>
            </div>
          ))}
          <button onClick={addOption} className="btn-secondary">+ Add Option</button>
        </div>
      )}

      {/* Config Section */}
      {field.config && (
        <div className="field-section">
          <h4>Configuration</h4>
          {field.config.rows !== undefined && (
            <div className="form-group">
              <label>Rows</label>
              <input
                type="number"
                value={field.config.rows}
                onChange={(e) => onChange({
                  config: { ...field.config, rows: parseInt(e.target.value) }
                })}
              />
            </div>
          )}
          {field.config.min !== undefined && (
            <div className="form-group">
              <label>Min Value</label>
              <input
                type="number"
                value={field.config.min}
                onChange={(e) => onChange({
                  config: { ...field.config, min: parseInt(e.target.value) }
                })}
              />
            </div>
          )}
          {field.config.max !== undefined && (
            <div className="form-group">
              <label>Max Value</label>
              <input
                type="number"
                value={field.config.max}
                onChange={(e) => onChange({
                  config: { ...field.config, max: parseInt(e.target.value) }
                })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FormBuilder;
