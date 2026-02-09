/**
 * Event Log Repository - NixFlow Event-Driven Architecture
 * 
 * This file provides database operations for event logging,
 * enabling audit trail and event replay capabilities.
 */

import { PrismaClient, EventLog } from '@prisma/client';

export interface EventLogFilters {
  eventType?: string;
  status?: string;
  priority?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface EventLogStats {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByStatus: Record<string, number>;
  eventsByPriority: Record<string, number>;
}

/**
 * Event Log Repository Class
 * Handles all database operations for event logs
 */
export class EventLogRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new event log entry
   * 
   * @param data - Event log data
   * @returns Created event log entry
   */
  async create(data: {
    eventId: string;
    eventType: string;
    eventData: string;
    metadata?: string | null;
    priority?: string;
    timestamp: Date;
    status?: string;
  }): Promise<EventLog> {
    return this.prisma.eventLog.create({
      data: {
        ...data,
        status: data.status || 'pending',
      },
    });
  }

  /**
   * Find event log by ID
   * 
   * @param id - Event log ID
   * @returns Event log entry or null
   */
  async findById(id: number): Promise<EventLog | null> {
    return this.prisma.eventLog.findUnique({
      where: { id },
    });
  }

  /**
   * Find event log by event ID
   * 
   * @param eventId - Event ID
   * @returns Event log entry or null
   */
  async findByEventId(eventId: string): Promise<EventLog | null> {
    return this.prisma.eventLog.findUnique({
      where: { eventId },
    });
  }

  /**
   * Find multiple event logs with filters
   * 
   * @param filters - Optional filters for query
   * @returns Array of event log entries
   */
  async findMany(filters?: EventLogFilters): Promise<EventLog[]> {
    const where: any = {};

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.eventLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });
  }

  /**
   * Find event logs by event type
   * 
   * @param eventType - Event type to filter by
   * @param limit - Maximum number of results
   * @returns Array of event log entries
   */
  async findByEventType(eventType: string, limit: number = 100): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { eventType },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Find event logs by status
   * 
   * @param status - Status to filter by
   * @param limit - Maximum number of results
   * @returns Array of event log entries
   */
  async findByStatus(status: string, limit: number = 100): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { status },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Find event logs by priority
   * 
   * @param priority - Priority to filter by
   * @param limit - Maximum number of results
   * @returns Array of event log entries
   */
  async findByPriority(priority: string, limit: number = 100): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { priority },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Find event logs within date range
   * 
   * @param startDate - Start date
   * @param endDate - End date
   * @param limit - Maximum number of results
   * @returns Array of event log entries
   */
  async findByDateRange(startDate: Date, endDate: Date, limit: number = 100): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get event log statistics
   * 
   * @param startDate - Optional start date for stats
   * @param endDate - Optional end date for stats
   * @returns Event log statistics
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<EventLogStats> {
    const where: any = {};

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = startDate;
      }
      if (endDate) {
        where.timestamp.lte = endDate;
      }
    }

    const allEvents = await this.prisma.eventLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
    });

    const totalEvents = allEvents.length;

    const eventsByType: Record<string, number> = {};
    const eventsByStatus: Record<string, number> = {};
    const eventsByPriority: Record<string, number> = {};

    for (const event of allEvents) {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      eventsByStatus[event.status] = (eventsByStatus[event.status] || 0) + 1;
      if (event.priority) {
        eventsByPriority[event.priority] = (eventsByPriority[event.priority] || 0) + 1;
      }
    }

    return {
      totalEvents,
      eventsByType,
      eventsByStatus,
      eventsByPriority,
    };
  }

  /**
   * Update event log status
   * 
   * @param id - Event log ID
   * @param status - New status
   * @param error - Optional error message
   * @param retryCount - Optional retry count
   * @returns Updated event log entry
   */
  async updateStatus(
    id: number,
    status: string,
    error?: string,
    retryCount?: number
  ): Promise<EventLog> {
    return this.prisma.eventLog.update({
      where: { id },
      data: {
        status,
        ...(error !== undefined && { error }),
        ...(retryCount !== undefined && { retryCount }),
      },
    });
  }

  /**
   * Increment retry count for event log
   * 
   * @param id - Event log ID
   * @returns Updated event log entry
   */
  async incrementRetryCount(id: number): Promise<EventLog> {
    const eventLog = await this.findById(id);
    if (!eventLog) {
      throw new Error(`Event log with ID ${id} not found`);
    }

    return this.prisma.eventLog.update({
      where: { id },
      data: {
        retryCount: eventLog.retryCount + 1,
      },
    });
  }

  /**
   * Delete event log by ID
   * 
   * @param id - Event log ID
   * @returns Deleted event log entry
   */
  async delete(id: number): Promise<EventLog> {
    return this.prisma.eventLog.delete({
      where: { id },
    });
  }

  /**
   * Delete event logs by event type
   * 
   * @param eventType - Event type to delete
   * @returns Number of deleted records
   */
  async deleteByEventType(eventType: string): Promise<{ count: number }> {
    return this.prisma.eventLog.deleteMany({
      where: { eventType },
    });
  }

  /**
   * Delete event logs by status
   * 
   * @param status - Status to delete
   * @returns Number of deleted records
   */
  async deleteByStatus(status: string): Promise<{ count: number }> {
    return this.prisma.eventLog.deleteMany({
      where: { status },
    });
  }

  /**
   * Delete event logs older than specified date
   * 
   * @param olderThan - Date threshold
   * @returns Number of deleted records
   */
  async deleteOlderThan(olderThan: Date): Promise<{ count: number }> {
    return this.prisma.eventLog.deleteMany({
      where: {
        timestamp: {
          lt: olderThan,
        },
      },
    });
  }

  /**
   * Count event logs with optional filters
   * 
   * @param filters - Optional filters for query
   * @returns Number of event logs
   */
  async count(filters?: EventLogFilters): Promise<number> {
    const where: any = {};

    if (filters?.eventType) {
      where.eventType = filters.eventType;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.priority) {
      where.priority = filters.priority;
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    return this.prisma.eventLog.count({ where });
  }

  /**
   * Get recent event logs
   * 
   * @param limit - Maximum number of results
   * @returns Array of recent event log entries
   */
  async getRecent(limit: number = 50): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed events
   * 
   * @param limit - Maximum number of results
   * @returns Array of failed event log entries
   */
  async getFailed(limit: number = 50): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { status: 'failed' },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }

  /**
   * Get pending events
   * 
   * @param limit - Maximum number of results
   * @returns Array of pending event log entries
   */
  async getPending(limit: number = 50): Promise<EventLog[]> {
    return this.prisma.eventLog.findMany({
      where: { status: 'pending' },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
