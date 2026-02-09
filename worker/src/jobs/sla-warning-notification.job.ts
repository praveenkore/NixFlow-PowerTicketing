/**
 * SLA Warning Notification Job Processor
 * 
 * This job processes notifications when tickets are approaching SLA breach thresholds,
 * sending alerts to assignees before the breach occurs.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SLAWarningNotificationJobData, WorkerJobResult, WorkerJobStatus } from '../types';

const prisma = new PrismaClient();

/**
 * SLA Warning Notification Job Processor
 * 
 * Fetches metric details and sends warning notifications to assignees.
 */
export async function slaWarningNotificationJob(
  job: Job<SLAWarningNotificationJobData>
): Promise<WorkerJobResult> {
  const startTime = Date.now();
  const { jobId, timestamp, ticketId, warningType, remainingMins, slaPolicyId } = job.data;

  console.log(`[SLA Warning Notification] Starting job ${jobId} for ticket ${ticketId}`);

  try {
    // Fetch metric details
    const metric = await prisma.sLAMetric.findUnique({
      where: { ticketId },
      include: {
        slaPolicy: {
          select: {
            id: true,
            name: true,
          },
        },
        ticket: {
          include: {
            requestor: {
              select: { id: true, name: true, email: true },
            },
            assignee: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    if (!metric) {
      console.log(`[SLA Warning Notification] No metric found for ticket ${ticketId}`);
      return {
        jobId,
        status: WorkerJobStatus.Completed,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        result: { message: 'No metric found' },
      };
    }

    // Prepare notification data
    const notificationData = {
      ticketId: metric.ticketId,
      ticketIdString: metric.ticket.ticketId,
      ticketTitle: metric.ticket.title,
      warningType,
      remainingMins,
      slaPolicyName: metric.slaPolicy.name,
      slaPolicyId: metric.slaPolicy.id,
      assigneeEmail: metric.ticket.assignee?.email,
      assigneeId: metric.ticket.assignee?.id,
      assigneeName: metric.ticket.assignee?.name,
      requestorEmail: metric.ticket.requestor?.email,
      requestorName: metric.ticket.requestor?.name,
      notificationChannels: job.data.notificationChannels,
    };

    // Send notifications
    const notificationResults = await sendNotifications(notificationData);

    // Create history log entry for warning notification
    await prisma.historyLog.create({
      data: {
        ticketId: metric.ticketId,
        userId: metric.ticket.assigneeId || metric.ticket.requestorId,
        action: 'SLA Warning Notification Sent',
        details: `SLA warning triggered for ${warningType}. ${remainingMins} minutes remaining until breach. Notification sent to assignee.`,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[SLA Warning Notification] Job ${jobId} completed in ${duration}ms`);

    return {
      jobId,
      status: WorkerJobStatus.Completed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      result: {
        ticketId: metric.ticketId,
        notificationResults,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SLA Warning Notification] Job ${jobId} failed:`, error);

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
 * Send notifications through configured channels
 */
async function sendNotifications(data: any): Promise<any> {
  const results: any = {
    email: { sent: false, error: null },
    inApp: { sent: false, error: null },
    sms: { sent: false, error: null },
  };

  // Send email notification
  if (data.notificationChannels.includes('email')) {
    try {
      await sendEmailNotification(data);
      results.email.sent = true;
      console.log(`[SLA Warning Notification] Email sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.email.error = error.message;
      console.error(`[SLA Warning Notification] Email failed:`, error.message);
    }
  }

  // In-app notification (placeholder - would integrate with notification system)
  if (data.notificationChannels.includes('in_app')) {
    try {
      await sendInAppNotification(data);
      results.inApp.sent = true;
      console.log(`[SLA Warning Notification] In-app notification sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.inApp.error = error.message;
      console.error(`[SLA Warning Notification] In-app notification failed:`, error.message);
    }
  }

  // SMS notification (placeholder - would integrate with SMS service)
  if (data.notificationChannels.includes('sms')) {
    try {
      await sendSMSNotification(data);
      results.sms.sent = true;
      console.log(`[SLA Warning Notification] SMS sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.sms.error = error.message;
      console.error(`[SLA Warning Notification] SMS failed:`, error.message);
    }
  }

  return results;
}

/**
 * Send email notification (placeholder implementation)
 */
async function sendEmailNotification(data: any): Promise<void> {
  // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
  console.log(`[Email] SLA Warning Notification`);
  console.log(`  To: ${data.assigneeEmail}`);
  console.log(`  Subject: SLA Warning - ${data.ticketIdString}`);
  console.log(`  Body: Ticket "${data.ticketTitle}" is approaching SLA breach for ${data.warningType}. ${data.remainingMins} minutes remaining.`);

  // Placeholder: In production, this would send an actual email
  // Example using nodemailer:
  // await transporter.sendMail({
  //   from: 'noreply@nixflow.com',
  //   to: data.assigneeEmail,
  //   subject: `SLA Warning - ${data.ticketIdString}`,
  //   html: `...email template...`,
  // });
}

/**
 * Send in-app notification (placeholder implementation)
 */
async function sendInAppNotification(data: any): Promise<void> {
  // TODO: Integrate with in-app notification system
  console.log(`[In-App] SLA Warning Notification for user ${data.assigneeId}`);

  // Placeholder: In production, this would create a notification record
  // await prisma.notification.create({
  //   data: {
  //     userId: data.assigneeId,
  //     type: 'SLA_WARNING',
  //     title: 'SLA Warning',
  //     message: `Ticket ${data.ticketIdString} is approaching SLA breach for ${data.warningType}. ${data.remainingMins} minutes remaining.`,
  //     data: { ticketId: data.ticketId, warningType: data.warningType },
  //   },
  // });
}

/**
 * Send SMS notification (placeholder implementation)
 */
async function sendSMSNotification(data: any): Promise<void> {
  // TODO: Integrate with SMS service (e.g., Twilio, AWS SNS)
  console.log(`[SMS] SLA Warning Notification for ${data.assigneeName}`);

  // Placeholder: In production, this would send an actual SMS
  // await twilioClient.messages.create({
  //   body: `SLA Warning: Ticket ${data.ticketIdString} is approaching ${data.warningType} breach. ${data.remainingMins} mins remaining.`,
  //   to: data.assigneePhone,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  // });
}
