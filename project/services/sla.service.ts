/**
 * SLA API Service for NixFlow Frontend
 * 
 * This service handles all API calls related to SLA (Service Level Agreement) management.
 * It provides methods for managing SLA policies, metrics, breaches, and compliance reports.
 */

import {
  SLAPolicy,
  SLAMetric,
  SLABreach,
  SLAComplianceReport,
  SLAPolicyFormData,
  SLABreachAcknowledgmentFormData,
  SLADashboardStats,
  SLAStatus,
  Category,
  Priority,
  SLABreachType,
} from '../types/sla';

// API base URL - should be in environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Helper function to make authenticated API calls
 */
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('authToken');
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
};

/**
 * SLA Service class
 * Provides methods for interacting with SLA-related API endpoints
 */
export class SLAService {
  /**
   * Get SLA policies with optional filters
   */
  static async getPolicies(params?: {
    isActive?: boolean;
    category?: Category;
    priority?: Priority;
    workflowId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ policies: SLAPolicy[]; pagination: { totalCount: number; totalPages: number } }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params?.category) queryParams.append('category', params.category);
      if (params?.priority) queryParams.append('priority', params.priority);
      if (params?.workflowId) queryParams.append('workflowId', params.workflowId.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const response = await apiCall(`/api/sla/policies?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA policies');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA policies:', error);
      throw error;
    }
  }

  /**
   * Get a specific SLA policy by ID
   */
  static async getPolicy(id: number): Promise<SLAPolicy> {
    try {
      const response = await apiCall(`/api/sla/policies/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA policy');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA policy:', error);
      throw error;
    }
  }

  /**
   * Create a new SLA policy
   */
  static async createPolicy(data: SLAPolicyFormData): Promise<SLAPolicy> {
    try {
      const response = await apiCall('/api/sla/policies', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create SLA policy');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating SLA policy:', error);
      throw error;
    }
  }

  /**
   * Update an existing SLA policy
   */
  static async updatePolicy(id: number, data: Partial<SLAPolicyFormData>): Promise<SLAPolicy> {
    try {
      const response = await apiCall(`/api/sla/policies/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update SLA policy');
      }
      return await response.json();
    } catch (error) {
      console.error('Error updating SLA policy:', error);
      throw error;
    }
  }

  /**
   * Delete an SLA policy
   */
  static async deletePolicy(id: number): Promise<void> {
    try {
      const response = await apiCall(`/api/sla/policies/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete SLA policy');
      }
    } catch (error) {
      console.error('Error deleting SLA policy:', error);
      throw error;
    }
  }

  /**
   * Get SLA metrics with optional filters
   */
  static async getMetrics(params?: {
    status?: SLAStatus;
    slaPolicyId?: number;
    ticketId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ metrics: SLAMetric[]; pagination: { totalCount: number; totalPages: number } }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.append('status', params.status);
      if (params?.slaPolicyId) queryParams.append('slaPolicyId', params.slaPolicyId.toString());
      if (params?.ticketId) queryParams.append('ticketId', params.ticketId.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const response = await apiCall(`/api/sla/metrics?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA metrics');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
      throw error;
    }
  }

  /**
   * Get SLA metric for a specific ticket
   */
  static async getMetricByTicketId(ticketId: number): Promise<SLAMetric | null> {
    try {
      const response = await apiCall(`/api/sla/metrics/ticket/${ticketId}`);
      if (response.status === 204 || response.status === 404) {
        return null;
      }
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA metric');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA metric:', error);
      throw error;
    }
  }

  /**
   * Get SLA breaches with optional filters
   */
  static async getBreaches(params?: {
    ticketId?: number;
    slaPolicyId?: number;
    breachType?: SLABreachType;
    acknowledged?: boolean;
    page?: number;
    pageSize?: number;
  }): Promise<{ breaches: SLABreach[]; pagination: { totalCount: number; totalPages: number } }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.ticketId) queryParams.append('ticketId', params.ticketId.toString());
      if (params?.slaPolicyId) queryParams.append('slaPolicyId', params.slaPolicyId.toString());
      if (params?.breachType) queryParams.append('breachType', params.breachType);
      if (params?.acknowledged !== undefined) queryParams.append('acknowledged', params.acknowledged.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

      const response = await apiCall(`/api/sla/breaches?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA breaches');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA breaches:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an SLA breach
   */
  static async acknowledgeBreach(id: number, data: SLABreachAcknowledgmentFormData): Promise<SLABreach> {
    try {
      const response = await apiCall(`/api/sla/breaches/${id}/acknowledge`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to acknowledge SLA breach');
      }
      return await response.json();
    } catch (error) {
      console.error('Error acknowledging SLA breach:', error);
      throw error;
    }
  }

  /**
   * Get SLA compliance report
   */
  static async getComplianceReport(params?: {
    startDate?: Date;
    endDate?: Date;
    slaPolicyId?: number;
    category?: Category;
    priority?: Priority;
  }): Promise<SLAComplianceReport> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.startDate) queryParams.append('startDate', params.startDate.toISOString());
      if (params?.endDate) queryParams.append('endDate', params.endDate.toISOString());
      if (params?.slaPolicyId) queryParams.append('slaPolicyId', params.slaPolicyId.toString());
      if (params?.category) queryParams.append('category', params.category);
      if (params?.priority) queryParams.append('priority', params.priority);

      const response = await apiCall(`/api/sla/reports/compliance?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA compliance report');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA compliance report:', error);
      throw error;
    }
  }

  /**
   * Get SLA dashboard statistics
   */
  static async getDashboardStats(): Promise<SLADashboardStats> {
    try {
      const response = await apiCall('/api/sla/dashboard/stats');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch SLA dashboard stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching SLA dashboard stats:', error);
      throw error;
    }
  }
}

export default SLAService;
