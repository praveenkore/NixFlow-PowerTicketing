/**
 * SLA Breach Notification Job Processor
 * 
 * This job processes notifications when SLA breaches are detected,
 * sending alerts to assignees and managers.
 */

import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { SLABreachNotificationJobData, WorkerJobResult, WorkerJobStatus } from '../types';

const prisma = new PrismaClient();

/**
 * SLA Breach Notification Job Processor
 * 
 * Fetches breach details and sends notifications to relevant stakeholders.
 */
export async function slaBreachNotificationJob(
  job: Job<SLABreachNotificationJobData>
): Promise<WorkerJobResult> {
  const startTime = Date.now();
  const { jobId, timestamp, ticketId, breachType, overageMins, slaPolicyId } = job.data;

  console.log(`[SLA Breach Notification] Starting job ${jobId} for ticket ${ticketId}`);

  try {
    // Fetch breach details
    const breach = await prisma.sLABreach.findFirst({
      where: {
        ticketId,
        breachType,
        status: 'Open',
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!breach) {
      console.log(`[SLA Breach Notification] No open breach found for ticket ${ticketId}`);
      return {
        jobId,
        status: WorkerJobStatus.Completed,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        result: { message: 'No open breach found' },
      };
    }

    // Get manager email if available
    let managerEmail: string | undefined;
    let managerId: number | undefined;
    if (breach.ticket.assignee) {
      const manager = await prisma.user.findFirst({
        where: { role: 'Manager' },
        select: { id: true, email: true },
      });
      if (manager) {
        managerEmail = manager.email;
        managerId = manager.id;
      }
    }

    // Prepare notification data
    const notificationData = {
      breachId: breach.id,
      ticketId: breach.ticketId,
      ticketIdString: breach.ticket.ticketId,
      ticketTitle: breach.ticket.title,
      breachType: breach.breachType,
      overageMins: breach.overageMins,
      slaPolicyName: breach.slaPolicy.name,
      slaPolicyId: breach.slaPolicy.id,
      assigneeEmail: breach.ticket.assignee?.email,
      assigneeId: breach.ticket.assignee?.id,
      assigneeName: breach.ticket.assignee?.name,
      managerEmail,
      managerId,
      requestorEmail: breach.ticket.requestor?.email,
      requestorName: breach.ticket.requestor?.name,
      notificationChannels: job.data.notificationChannels,
      priority: job.data.priority,
    };

    // Send notifications
    const notificationResults = await sendNotifications(notificationData);

    // Create history log entry for breach notification
    await prisma.historyLog.create({
      data: {
        ticketId: breach.ticketId,
        userId: breach.ticket.assigneeId || breach.ticket.requestorId,
        action: 'SLA Breach Notification Sent',
        details: `SLA breach detected for ${breach.breachType}. Over by ${breach.overageMins} minutes. Notification sent to assignee and manager.`,
      },
    });

    const duration = Date.now() - startTime;
    console.log(`[SLA Breach Notification] Job ${jobId} completed in ${duration}ms`);

    return {
      jobId,
      status: WorkerJobStatus.Completed,
      startedAt: new Date(startTime),
      completedAt: new Date(),
      durationMs: duration,
      result: {
        breachId: breach.id,
        notificationResults,
      },
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[SLA Breach Notification] Job ${jobId} failed:`, error);

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
    webhook: { sent: false, error: null },
  };

  // Send email notification
  if (data.notificationChannels.includes('email')) {
    try {
      await sendEmailNotification(data);
      results.email.sent = true;
      console.log(`[SLA Breach Notification] Email sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.email.error = error.message;
      console.error(`[SLA Breach Notification] Email failed:`, error.message);
    }
  }

  // In-app notification (placeholder - would integrate with notification system)
  if (data.notificationChannels.includes('in_app')) {
    try {
      await sendInAppNotification(data);
      results.inApp.sent = true;
      console.log(`[SLA Breach Notification] In-app notification sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.inApp.error = error.message;
      console.error(`[SLA Breach Notification] In-app notification failed:`, error.message);
    }
  }

  // SMS notification (placeholder - would integrate with SMS service)
  if (data.notificationChannels.includes('sms')) {
    try {
      await sendSMSNotification(data);
      results.sms.sent = true;
      console.log(`[SLA Breach Notification] SMS sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.sms.error = error.message;
      console.error(`[SLA Breach Notification] SMS failed:`, error.message);
    }
  }

  // Webhook notification (placeholder - would integrate with webhook service)
  if (data.notificationChannels.includes('webhook')) {
    try {
      await sendWebhookNotification(data);
      results.webhook.sent = true;
      console.log(`[SLA Breach Notification] Webhook sent for ticket ${data.ticketIdString}`);
    } catch (error: any) {
      results.webhook.error = error.message;
      console.error(`[SLA Breach Notification] Webhook failed:`, error.message);
    }
  }

  return results;
}

/**
 * Send email notification (placeholder implementation)
 */
async function sendEmailNotification(data: any): Promise<void> {
  // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Nodemailer)
  console.log(`[Email] SLA Breach Notification`);
  console.log(`  To: ${data.assigneeEmail}, ${data.managerEmail}`);
  console.log(`  Subject: SLA Breach Alert - ${data.ticketIdString}`);
  console.log(`  Body: Ticket "${data.ticketTitle}" has breached SLA for ${data.breachType}. Over by ${data.overageMins} minutes.`);

  // Placeholder: In production, this would send an actual email
  // Example using nodemailer:
  // await transporter.sendMail({
  //   from: 'noreply@nixflow.com',
  //   to: [data.assigneeEmail, data.managerEmail].filter(Boolean),
  //   subject: `SLA Breach Alert - ${data.ticketIdString}`,
  //   html: `...email template...`,
  // });
}

/**
 * Send in-app notification (placeholder implementation)
 */
async function sendInAppNotification(data: any): Promise<void> {
  // TODO: Integrate with in-app notification system
  console.log(`[In-App] SLA Breach Notification for user ${data.assigneeId}`);

  // Placeholder: In production, this would create a notification record
  // await prisma.notification.create({
  //   data: {
  //     userId: data.assigneeId,
  //     type: 'SLA_BREACH',
  //     title: 'SLA Breach Alert',
  //     message: `Ticket ${data.ticketIdString} has breached SLA for ${data.breachType}.`,
  //     data: { ticketId: data.ticketId, breachId: data.breachId },
  //   },
  // });
}

/**
 * Send SMS notification (placeholder implementation)
 */
async function sendSMSNotification(data: any): Promise<void> {
  // TODO: Integrate with SMS service (e.g., Twilio, AWS SNS)
  console.log(`[SMS] SLA Breach Notification for ${data.assigneeName}`);

  // Placeholder: In production, this would send an actual SMS
  // await twilioClient.messages.create({
  //   body: `SLA Breach Alert: Ticket ${data.ticketIdString} has breached ${data.breachType}. Over by ${data.overageMins} mins.`,
  //   to: data.assigneePhone,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  // });
}

/**
 * Send webhook notification (placeholder implementation)
 */
async function sendWebhookNotification(data: any): Promise<void> {
  // TODO: Integrate with webhook service
  console.log(`[Webhook] SLA Breach Notification sent to configured endpoints`);

  // Placeholder: In production, this would send a webhook payload
  // await fetch(process.env.SLA_BREACH_WEBHOOK_URL, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     event: 'sla_breach',
  //     data: data,
  //     timestamp: new Date().toISOString(),
  //   }),
  // });
}
