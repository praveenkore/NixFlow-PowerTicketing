/**
 * Public Form Component - Renders a form for end users to submit
 */

import React, { useState, useEffect } from 'react';
import { CustomFormDefinition, FormFieldDefinition, FormSubmissionData, FormFieldType } from '../types/form.types';

interface PublicFormProps {
  slug: string;
  onSuccess?: (response: { id: number; ticketId?: number; message: string }) => void;
  onError?: (error: string) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const PublicForm: React.FC<PublicFormProps> = ({ slug, onSuccess, onError }) => {
  const [form, setForm] = useState<CustomFormDefinition | null>(null);
  const [formData, setFormData] = useState<FormSubmissionData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/public/forms/${slug}`);
      
      if (!response.ok) {
        throw new Error('Form not found or not available');
      }
      
      const formData = await response.json();
      setForm(formData);
      
      // Initialize form data with default values
      const initialData: FormSubmissionData = {};
      formData.fields.forEach((field: FormFieldDefinition) => {
        if (field.defaultValue) {
          initialData[field.name] = field.defaultValue;
        }
      });
      setFormData(initialData);
    } catch (err: any) {
      setGeneralError(err.message);
      onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    // Clear error for this field
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!form) return false;

    for (const field of form.fields) {
      const value = formData[field.name];
      const validation = field.validation;

      if (!validation) continue;

      // Required check
      if (validation.required) {
        const isEmpty = value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
          newErrors[field.name] = validation.customErrorMessage || `${field.label} is required`;
          isValid = false;
          continue;
        }
      }

      // Skip further validation if value is empty and not required
      if (value === null || value === undefined || value === '') {
        continue;
      }

      const strValue = String(value);

      // Min length check
      if (validation.minLength && strValue.length < validation.minLength) {
        newErrors[field.name] = `${field.label} must be at least ${validation.minLength} characters`;
        isValid = false;
      }

      // Max length check
      if (validation.maxLength && strValue.length > validation.maxLength) {
        newErrors[field.name] = `${field.label} must be no more than ${validation.maxLength} characters`;
        isValid = false;
      }

      // Pattern check
      if (validation.pattern) {
        const regex = new RegExp(validation.pattern);
        if (!regex.test(strValue)) {
          newErrors[field.name] = validation.customErrorMessage || `${field.label} format is invalid`;
          isValid = false;
        }
      }

      // Email check
      if (validation.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strValue)) {
          newErrors[field.name] = `${field.label} must be a valid email address`;
          isValid = false;
        }
      }

      // URL check
      if (validation.url) {
        try {
          new URL(strValue);
        } catch {
          newErrors[field.name] = `${field.label} must be a valid URL`;
          isValid = false;
        }
      }

      // Min/Max for numbers
      if (typeof value === 'number') {
        if (validation.min !== undefined && value < validation.min) {
          newErrors[field.name] = `${field.label} must be at least ${validation.min}`;
          isValid = false;
        }
        if (validation.max !== undefined && value > validation.max) {
          newErrors[field.name] = `${field.label} must be no more than ${validation.max}`;
          isValid = false;
        }
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setGeneralError(null);

    try {
      const response = await fetch(`${API_URL}/api/public/forms/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formSlug: slug,
          data: formData,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit form');
      }

      const result = await response.json();
      setSubmitted(true);
      onSuccess?.(result);
    } catch (err: any) {
      setGeneralError(err.message);
      onError?.(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="public-form-loading">
        <div className="spinner"></div>
        <p>Loading form...</p>
      </div>
    );
  }

  if (generalError && !form) {
    return (
      <div className="public-form-error">
        <p>{generalError}</p>
        <button onClick={fetchForm}>Try Again</button>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="public-form-error">
        <p>Form not found</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-success">
        <div className="success-icon">✓</div>
        <h3>Success!</h3>
        <p>{form.successMessage || 'Thank you for your submission.'}</p>
        <button onClick={() => {
          setSubmitted(false);
          setFormData({});
        }}>
          Submit Another Response
        </button>
      </div>
    );
  }

  return (
    <div className="public-form">
      <div className="public-form-header">
        <h2>{form.name}</h2>
        {form.description && <p className="form-description">{form.description}</p>}
      </div>

      {generalError && (
        <div className="alert alert-error">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="public-form-content">
        <div className="form-fields-grid">
          {form.fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={formData[field.name]}
              error={errors[field.name]}
              onChange={(value) => handleFieldChange(field.name, value)}
              formData={formData}
            />
          ))}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn-primary btn-large"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : (form.submitButtonText || 'Submit')}
          </button>
        </div>
      </form>
    </div>
  );
};

// Individual Form Field Component
interface FormFieldProps {
  field: FormFieldDefinition;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  formData: FormSubmissionData;
}

const FormField: React.FC<FormFieldProps> = ({ field, value, error, onChange, formData }) => {
  // Check conditional logic
  if (field.conditionalLogic?.showWhen) {
    const conditions = field.conditionalLogic.showWhen;
    const logicOperator = field.conditionalLogic.logicOperator || 'AND';
    
    const results = conditions.map(condition => {
      const fieldValue = formData[condition.field];
      switch (condition.operator) {
        case 'equals':
          return fieldValue === condition.value;
        case 'notEquals':
          return fieldValue !== condition.value;
        case 'contains':
          return String(fieldValue).includes(String(condition.value));
        case 'notContains':
          return !String(fieldValue).includes(String(condition.value));
        case 'greaterThan':
          return Number(fieldValue) > Number(condition.value);
        case 'lessThan':
          return Number(fieldValue) < Number(condition.value);
        case 'isEmpty':
          return !fieldValue || String(fieldValue).trim() === '';
        case 'isNotEmpty':
          return !!fieldValue && String(fieldValue).trim() !== '';
        default:
          return true;
      }
    });

    const shouldShow = logicOperator === 'AND' 
      ? results.every(r => r) 
      : results.some(r => r);

    if (!shouldShow) return null;
  }

  const widthClass = `field-width-${field.width || 'full'}`;
  const hasError = !!error;

  const renderInput = () => {
    switch (field.type) {
      case FormFieldType.TEXT:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.TEXTAREA:
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={field.config?.rows || 4}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.NUMBER:
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={field.placeholder}
            min={field.config?.min}
            max={field.config?.max}
            step={field.config?.step}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.EMAIL:
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'email@example.com'}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.PHONE:
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '+1 (555) 123-4567'}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.DATE:
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.DATETIME:
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.SELECT:
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={hasError ? 'error' : ''}
          >
            <option value="">-- Select --</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case FormFieldType.MULTISELECT:
        return (
          <select
            multiple
            value={value || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              onChange(selected);
            }}
            className={hasError ? 'error' : ''}
            size={Math.min(field.options?.length || 3, 5)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case FormFieldType.CHECKBOX:
        if (field.options && field.options.length > 0) {
          return (
            <div className="checkbox-group">
              {field.options.map((option) => (
                <label key={option.value} className="checkbox-label">
                  <input
                    type="checkbox"
                    value={option.value}
                    checked={(value || []).includes(option.value)}
                    onChange={(e) => {
                      const current = (value || []) as string[];
                      if (e.target.checked) {
                        onChange([...current, option.value]);
                      } else {
                        onChange(current.filter(v => v !== option.value));
                      }
                    }}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          );
        }
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
            />
            {field.label}
          </label>
        );

      case FormFieldType.RADIO:
        return (
          <div className="radio-group">
            {field.options?.map((option) => (
              <label key={option.value} className="radio-label">
                <input
                  type="radio"
                  name={field.name}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange(e.target.value)}
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      case FormFieldType.URL:
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || 'https://example.com'}
            className={hasError ? 'error' : ''}
          />
        );

      case FormFieldType.RATING:
        return (
          <div className="rating-input">
            {Array.from({ length: (field.config?.max || 5) - (field.config?.min || 1) + 1 }, (_, i) => {
              const rating = (field.config?.min || 1) + i;
              return (
                <button
                  key={rating}
                  type="button"
                  className={`rating-star ${value && rating <= value ? 'active' : ''}`}
                  onClick={() => onChange(rating)}
                >
                  ★
                </button>
              );
            })}
          </div>
        );

      case FormFieldType.SLIDER:
        return (
          <div className="slider-input">
            <input
              type="range"
              min={field.config?.min || 0}
              max={field.config?.max || 100}
              step={field.config?.step || 1}
              value={value || field.config?.min || 0}
              onChange={(e) => onChange(parseFloat(e.target.value))}
            />
            <span className="slider-value">{value || field.config?.min || 0}</span>
          </div>
        );

      case FormFieldType.FILE:
        return (
          <input
            type="file"
            multiple={field.config?.multiple}
            accept={field.config?.accept}
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                onChange(Array.from(files));
              }
            }}
            className={hasError ? 'error' : ''}
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={hasError ? 'error' : ''}
          />
        );
    }
  };

  return (
    <div className={`form-field ${widthClass} ${hasError ? 'has-error' : ''}`}>
      {field.type !== FormFieldType.CHECKBOX && (
        <label>
          {field.label}
          {field.validation?.required && <span className="required">*</span>}
        </label>
      )}
      {field.helpText && <p className="help-text">{field.helpText}</p>}
      {renderInput()}
      {error && <span className="error-message">{error}</span>}
    </div>
  );
};

export default PublicForm;
