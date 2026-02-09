/**
 * SLA Report Service - Business logic for SLA compliance reporting
 * 
 * This service handles generation of SLA compliance reports with statistics
 * and trend analysis.
 */

import slaRepository from '../repositories/sla.repository';
import { SLAComplianceReport } from '../types/sla.types';

export class SLAReportService {
  /**
   * Get SLA Compliance Report
   */
  async getComplianceReport(startDate?: Date, endDate?: Date): Promise<SLAComplianceReport> {
    return await slaRepository.getComplianceReport(startDate, endDate);
  }
}

export default new SLAReportService();
