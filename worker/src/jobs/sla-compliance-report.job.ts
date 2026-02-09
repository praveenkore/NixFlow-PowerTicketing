/**
 * SLA Compliance Report Job Processor
 * 
 * This job generates SLA compliance reports for specified date ranges
 * and sends them to administrators via email.
 */

import { Job } from 'bullmq';
import { PrismaClient, Status } from '@prisma/client';
import { SLAStatus, SLABreachType } from '../../../backend/src/types/sla.types';
import { SLAComplianceReportJobData, WorkerJobResult, WorkerJobStatus } from '../types';

const prisma = new PrismaClient();

/**
 * SLA Compliance Report Job Processor
 * 
 * Generates compliance report and sends it to administrators.
 */
export async function slaComplianceReportJob(
  job: Job<SLAComplianceReportJobData>
): Promise<WorkerJobResult> {
  const startTime = Date.now();
  const { jobId, timestamp, reportPeriod, reportType, recipients, includeDetails, filters } = job.data;

  console.log(
    `[SLA Compliance Report] Starting job ${jobId} for period ${reportPeriod.startDate.toISOString()} to ${reportPeriod.endDate.toISOString()}`
  );

  try {
    // Generate compliance report
    const report = await generateComplianceReport(reportPeriod.startDate, reportPeriod.endDate, includeDetails, filters);

    // Send report to recipients
    const notificationResults = await sendReportEmail(recipients, report, reportType, (includeDetails as any));

    const duration = Date.now() - startTime;
    console.log(`[SLA Compliance Report] Job ${jobId} completed in ${duration}ms`);

    return {
      jobId,
      status: WorkerJobStatus.Completed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      result: {
        report,
        notificationResults,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SLA Compliance Report] Job ${jobId} failed:`, error);

    return {
      jobId,
      status: WorkerJobStatus.Failed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      error: {
        message: error.message,
        stack: error.stack,
      },
    };
  }
}

/**
 * Generate SLA compliance report
 */
async function generateComplianceReport(
  startDate: Date,
  endDate: Date,
  includeDetails?: boolean,
  filters?: {
    categories?: string[];
    priorities?: string[];
    workflows?: number[];
  }
): Promise<any> {
  console.log(`[SLA Compliance Report] Generating report for ${startDate.toISOString()} to ${endDate.toISOString()}`);

  // Build where clause based on filters
  const whereClause: any = {
    ticket: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  };

  if (filters?.categories && filters.categories.length > 0) {
    whereClause.ticket.category = { in: filters.categories };
  }

  if (filters?.priorities && filters.priorities.length > 0) {
    whereClause.ticket.priority = { in: filters.priorities };
  }

  if (filters?.workflows && filters.workflows.length > 0) {
    whereClause.ticket.workflowId = { in: filters.workflows };
  }

  // Get all metrics in the period
  const metrics = await prisma.sLAMetric.findMany({
    where: whereClause,
    include: {
      slaPolicy: {
        select: {
          id: true,
          name: true,
          category: true,
          priority: true,
        },
      },
      ticket: {
        select: {
          id: true,
          ticketId: true,
          title: true,
          category: true,
          priority: true,
          status: true,
          createdAt: true,
        },
      },
      slaBreaches: true,
    },
  });

  // Calculate statistics
  const totalTickets = metrics.length;
  const ticketsWithinSLA = metrics.filter((m: any) => m.status === 'WithinSLA').length;
  const ticketsWithWarning = metrics.filter((m: any) => m.status === 'Warning').length;
  const ticketsBreached = metrics.filter((m: any) => m.status === 'Breached').length;
  const complianceRate = totalTickets > 0 ? (ticketsWithinSLA / totalTickets) * 100 : 0;

  // Calculate average times
  const responseTimes = metrics.filter((m: any) => m.responseTimeMins !== null).map((m: any) => m.responseTimeMins!);
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length
      : 0;

  const resolutionTimes = metrics.filter((m: any) => m.resolutionTimeMins !== null).map((m: any) => m.resolutionTimeMins!);
  const avgResolutionTime =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum: number, time: number) => sum + time, 0) / resolutionTimes.length
      : 0;

  const approvalTimes = metrics.filter((m: any) => m.approvalTimeMins !== null).map((m: any) => m.approvalTimeMins!);
  const avgApprovalTime =
    approvalTimes.length > 0
      ? approvalTimes.reduce((sum: number, time: number) => sum + time, 0) / approvalTimes.length
      : 0;

  // Count breaches by type
  const allBreaches = metrics.flatMap((m: any) => m.slaBreaches);
  const breachesByType = {
    ResponseTime: allBreaches.filter((b: any) => b.breachType === 'ResponseTime').length,
    ResolutionTime: allBreaches.filter((b: any) => b.breachType === 'ResolutionTime').length,
    ApprovalTime: allBreaches.filter((b: any) => b.breachType === 'ApprovalTime').length,
  };

  // Count breaches by priority
  const breachesByPriority: any = {};
  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  for (const priority of priorities) {
    breachesByPriority[priority] = metrics
      .filter((m: any) => m.ticket.priority === priority)
      .reduce((sum: number, m: any) => sum + m.slaBreaches.length, 0);
  }

  // Count breaches by category
  const breachesByCategory: any = {};
  const categories = ['GeneralInquiry', 'TechnicalSupport', 'BillingQuestion', 'BugReport', 'FeatureRequest', 'Hardware', 'ProductionChange'];
  for (const category of categories) {
    breachesByCategory[category] = metrics
      .filter((m: any) => m.ticket.category === category)
      .reduce((sum: number, m: any) => sum + m.slaBreaches.length, 0);
  }

  // Build report
  const report = {
    reportPeriod: {
      startDate,
      endDate,
    },
    summary: {
      totalTickets,
      ticketsWithinSLA,
      ticketsWithWarning,
      ticketsBreached,
      complianceRate: Math.round(complianceRate * 100) / 100,
    },
    averages: {
      responseTime: Math.round(avgResponseTime * 100) / 100,
      resolutionTime: Math.round(avgResolutionTime * 100) / 100,
      approvalTime: Math.round(avgApprovalTime * 100) / 100,
    },
    breaches: {
      total: allBreaches.length,
      byType: breachesByType,
      byPriority: breachesByPriority,
      byCategory: breachesByCategory,
    },
    // Include detailed metrics if requested
    ...(includeDetails && {
      details: metrics.map((m: any) => ({
        ticketId: m.ticket.ticketId,
        title: m.ticket.title,
        category: m.ticket.category,
        priority: m.ticket.priority,
        status: m.ticket.status,
        slaPolicy: m.slaPolicy.name,
        slaStatus: m.status,
        responseTimeMins: m.responseTimeMins,
        resolutionTimeMins: m.resolutionTimeMins,
        approvalTimeMins: m.approvalTimeMins,
        breaches: m.slaBreaches.length,
      })),
    }),
  };

  console.log(`[SLA Compliance Report] Report generated: ${totalTickets} tickets, ${complianceRate.toFixed(2)}% compliance`);
  return report;
}

/**
 * Send report email to recipients
 */
async function sendReportEmail(
  recipients: string[],
  report: any,
  reportType: string,
  includeDetails?: boolean
): Promise<any> {
  const results: any = {
    sent: false,
    recipients: [],
    errors: [],
  };

  try {
    // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
    console.log(`[Email] SLA Compliance Report (${reportType})`);
    console.log(`  To: ${recipients.join(', ')}`);
    console.log(`  Subject: SLA Compliance Report - ${reportType}`);
    console.log(`  Summary:`);
    console.log(`    Total Tickets: ${report.summary.totalTickets}`);
    console.log(`    Compliance Rate: ${report.summary.complianceRate}%`);
    console.log(`    Avg Response Time: ${report.averages.responseTime} mins`);
    console.log(`    Avg Resolution Time: ${report.averages.resolutionTime} mins`);
    console.log(`    Total Breaches: ${report.breaches.total}`);

    if (includeDetails && report.details) {
      console.log(`    Details included: ${report.details.length} tickets`);
    }

    // Placeholder: In production, this would send an actual email
    // Example using nodemailer:
    // await transporter.sendMail({
    //   from: 'noreply@nixflow.com',
    //   to: recipients,
    //   subject: `SLA Compliance Report - ${reportType}`,
    //   html: generateReportHTML(report, reportType, includeDetails),
    //   attachments: [
    //     {
    //       filename: `sla-compliance-report-${reportType}-${Date.now()}.json`,
    //       content: JSON.stringify(report, null, 2),
    //     },
    //   ],
    // });

    results.sent = true;
    results.recipients = recipients;
  } catch (error: any) {
    results.errors.push(error.message);
    console.error(`[SLA Compliance Report] Email failed:`, error.message);
  }

  return results;
}

/**
 * Generate HTML report (placeholder implementation)
 */
function generateReportHTML(report: any, reportType: string, includeDetails?: boolean): string {
  // TODO: Generate HTML email template
  return `
    <html>
      <body>
        <h1>SLA Compliance Report - ${reportType}</h1>
        <h2>Report Period</h2>
        <p>${report.reportPeriod.startDate} to ${report.reportPeriod.endDate}</p>
        
        <h2>Summary</h2>
        <ul>
          <li>Total Tickets: ${report.summary.totalTickets}</li>
          <li>Within SLA: ${report.summary.ticketsWithinSLA}</li>
          <li>Warning: ${report.summary.ticketsWithWarning}</li>
          <li>Breached: ${report.summary.ticketsBreached}</li>
          <li>Compliance Rate: ${report.summary.complianceRate}%</li>
        </ul>
        
        <h2>Averages</h2>
        <ul>
          <li>Response Time: ${report.averages.responseTime} mins</li>
          <li>Resolution Time: ${report.averages.resolutionTime} mins</li>
          <li>Approval Time: ${report.averages.approvalTime} mins</li>
        </ul>
        
        <h2>Breaches</h2>
        <ul>
          <li>Total: ${report.breaches.total}</li>
          <li>Response Time: ${report.breaches.byType.ResponseTime}</li>
          <li>Resolution Time: ${report.breaches.byType.ResolutionTime}</li>
          <li>Approval Time: ${report.breaches.byType.ApprovalTime}</li>
        </ul>
        
        ${includeDetails ? '<h2>Detailed Metrics</h2><p>See attached JSON file for full details.</p>' : ''}
      </body>
    </html>
  `;
}
