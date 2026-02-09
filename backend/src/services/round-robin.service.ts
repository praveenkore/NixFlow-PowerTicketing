/**
 * Round-Robin Service - NixFlow Event-Driven Architecture
 * 
 * This file implements round-robin assignment logic using Redis
 * for persistent, cross-process counter management.
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';

/**
 * Round-Robin Service Class
 * Handles round-robin assignment with Redis-based counters
 */
export class RoundRobinService {
  private prisma: PrismaClient;
  private redisClient: Redis;
  private isConnected: boolean = false;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    if (process.env.REDIS_URL) {
      this.redisClient = new Redis(process.env.REDIS_URL);
    } else {
      this.redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
      });
    }
  }

  /**
   * Connect to Redis
   */
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.redisClient.connect();
      this.isConnected = true;
      console.log('[RoundRobinService] Connected to Redis');
    } catch (error: any) {
      console.error('[RoundRobinService] Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.redisClient.quit();
      this.isConnected = false;
      console.log('[RoundRobinService] Disconnected from Redis');
    } catch (error: any) {
      console.error('[RoundRobinService] Error disconnecting from Redis:', error);
    }
  }

  /**
   * Get next assignee for a role using round-robin
   * 
   * @param role - The role to get assignee for
   * @returns Next assignee or null if no users in role
   */
  async getNextAssignee(role: string): Promise<any | null> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Get all users in role
      const usersInRole = await this.prisma.user.findMany({
        where: {
          role: role as any,
          id: { not: 0 }, // Exclude system user
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      if (usersInRole.length === 0) {
        console.warn(`[RoundRobinService] No users found for role: ${role}`);
        return null;
      }

      // Get or create round-robin counter for this role
      const counterKey = `round-robin:${role}`;
      const currentIndex = await this.redisClient.incr(counterKey) - 1;
      const assigneeIndex = currentIndex % usersInRole.length;

      const nextAssignee = usersInRole[assigneeIndex];

      console.log(`[RoundRobinService] Next assignee for role ${role}: ${nextAssignee.name} (index: ${assigneeIndex})`);

      return nextAssignee;
    } catch (error: any) {
      console.error(`[RoundRobinService] Error getting next assignee: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset round-robin counter for a role
   * 
   * @param role - The role to reset counter for
   */
  async resetCounter(role: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const counterKey = `round-robin:${role}`;
      await this.redisClient.del(counterKey);
      console.log(`[RoundRobinService] Reset counter for role: ${role}`);
    } catch (error: any) {
      console.error(`[RoundRobinService] Error resetting counter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current counter value for a role
   * 
   * @param role - The role to get counter for
   * @returns Current counter value or 0 if not set
   */
  async getCounter(role: string): Promise<number> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const counterKey = `round-robin:${role}`;
      const value = await this.redisClient.get(counterKey);
      return value ? parseInt(value, 10) : 0;
    } catch (error: any) {
      console.error(`[RoundRobinService] Error getting counter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all counter values
   * 
   * @returns Object with all counter values
   */
  async getAllCounters(): Promise<Record<string, number>> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const pattern = 'round-robin:*';
      const keys = await this.redisClient.keys(pattern);

      const counters: Record<string, number> = {};
      for (const key of keys) {
        const value = await this.redisClient.get(key);
        if (value) {
          const role = key.replace('round-robin:', '');
          counters[role] = parseInt(value, 10);
        }
      }

      return counters;
    } catch (error: any) {
      console.error(`[RoundRobinService] Error getting all counters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reset all counters
   */
  async resetAllCounters(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const pattern = 'round-robin:*';
      const keys = await this.redisClient.keys(pattern);

      if (keys.length > 0) {
        await this.redisClient.del(...keys);
        console.log(`[RoundRobinService] Reset ${keys.length} counters`);
      }
    } catch (error: any) {
      console.error(`[RoundRobinService] Error resetting all counters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    await this.prisma.$disconnect();
    console.log('[RoundRobinService] Destroyed');
  }
}
