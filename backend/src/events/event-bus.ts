/**
 * Event Bus - NixFlow Event-Driven Architecture
 * 
 * This file implements a distributed event bus using Redis Pub/Sub for
 * cross-process event communication and local EventEmitter for in-process events.
 * 
 * Features:
 * - Redis Pub/Sub for distributed event broadcasting
 * - Local EventEmitter for in-process event handling
 * - Event logging for audit trail
 * - Event deduplication
 * - Error handling and retry logic
 */

import { EventEmitter } from 'events';
import { createClient, RedisClientType, RedisClientOptions } from 'redis';
import {
  BaseEventPayload,
  Event,
  EventMetadata,
  EventPriority,
  EventStatus,
} from './event-types';
import { PrismaClient } from '@prisma/client';

export interface EventBusConfig {
  redisUrl: string;
  redisOptions?: RedisClientOptions;
  enableLogging?: boolean;
  enableDeduplication?: boolean;
  deduplicationTtlMs?: number;
}

export interface EventListener {
  eventType: string;
  listener: (event: Event) => void | Promise<void>;
  once?: boolean;
}

/**
 * Event Bus Class
 * Handles event emission and subscription with Redis Pub/Sub
 */
export class EventBus {
  private redisClient: any;
  private redisSubscriber: any;
  private localEmitter: EventEmitter;
  private config: EventBusConfig;
  private prisma: PrismaClient;
  private listeners: Map<string, Set<EventListener>> = new Map();
  private eventCache: Map<string, number> = new Map(); // For deduplication
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  constructor(config: EventBusConfig) {
    this.config = {
      enableLogging: true,
      enableDeduplication: true,
      deduplicationTtlMs: 5000, // 5 seconds
      ...config,
    };

    this.localEmitter = new EventEmitter();
    this.prisma = new PrismaClient();

    // Initialize Redis clients
    this.redisClient = createClient({
      url: this.config.redisUrl,
      ...this.config.redisOptions,
    });

    this.redisSubscriber = createClient({
      url: this.config.redisUrl,
      ...this.config.redisOptions,
    });

    this.setupErrorHandlers();
  }

  /**
   * Connect to Redis and initialize event bus
   */
  async connect(): Promise<void> {
    if (this.isConnected || this.isConnecting) {
      return;
    }

    this.isConnecting = true;

    try {
      await Promise.all([
        this.redisClient.connect(),
        this.redisSubscriber.connect(),
      ]);

      // Subscribe to Redis channel for cross-process events
      await this.redisSubscriber.subscribe('nixflow:events', (message: string) => {
        this.handleIncomingMessage(message);
      });

      this.isConnected = true;
      this.isConnecting = false;

      this.log('Event bus connected successfully');
      this.localEmitter.emit('connected');
    } catch (error: any) {
      this.isConnecting = false;
      this.log(`Failed to connect event bus: ${error.message}`, 'error');
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
      await Promise.all([
        this.redisClient.disconnect(),
        this.redisSubscriber.disconnect(),
      ]);

      this.isConnected = false;
      this.log('Event bus disconnected');
      this.localEmitter.emit('disconnected');
    } catch (error: any) {
      this.log(`Error disconnecting event bus: ${error.message}`, 'error');
    }
  }

  /**
   * Emit an event to the event bus
   * 
   * @param eventType - The type of event to emit
   * @param data - Event-specific data
   * @param metadata - Optional event metadata
   * @param priority - Event priority for prioritization
   */
  async emit(
    eventType: string,
    data: any,
    metadata?: EventMetadata,
    priority: EventPriority = EventPriority.NORMAL
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Event bus is not connected. Call connect() first.');
    }

    const event: Event = {
      id: this.generateEventId(),
      eventType,
      timestamp: new Date(),
      data,
      metadata: {
        source: process.env.NODE_ENV || 'backend',
        version: '1.0.0',
        ...metadata,
      },
      priority,
      status: EventStatus.PENDING,
      retryCount: 0,
    };

    // Check for deduplication
    if (this.config.enableDeduplication) {
      const cacheKey = this.getEventCacheKey(event);
      if (this.eventCache.has(cacheKey)) {
        this.log(`Duplicate event detected and skipped: ${eventType}`, 'warn');
        return;
      }
      this.eventCache.set(cacheKey, Date.now());

      // Clean up old cache entries
      this.cleanupEventCache();
    }

    // Emit locally
    this.localEmitter.emit(eventType, event);

    // Publish to Redis for other processes
    try {
      await this.redisClient.publish('nixflow:events', JSON.stringify(event));
      this.log(`Event emitted: ${eventType}`, 'debug');
    } catch (error: any) {
      this.log(`Failed to publish event to Redis: ${error.message}`, 'error');
      throw error;
    }

    // Log event to database if logging is enabled
    if (this.config.enableLogging) {
      await this.logEventToDatabase(event).catch((err) => {
        this.log(`Failed to log event to database: ${err.message}`, 'error');
      });
    }
  }

  /**
   * Subscribe to events of a specific type
   * 
   * @param eventType - The type of event to subscribe to
   * @param listener - The callback function to handle the event
   * @returns Unsubscribe function
   */
  on(eventType: string, listener: (event: Event) => void | Promise<void>): () => void {
    const eventListener: EventListener = {
      eventType,
      listener,
      once: false,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(eventListener);
    this.localEmitter.on(eventType, listener);

    this.log(`Listener registered for event type: ${eventType}`, 'debug');

    // Return unsubscribe function
    return () => this.off(eventType, listener);
  }

  /**
   * Subscribe to events of a specific type (one-time)
   * 
   * @param eventType - The type of event to subscribe to
   * @param listener - The callback function to handle the event
   * @returns Unsubscribe function
   */
  once(eventType: string, listener: (event: Event) => void | Promise<void>): () => void {
    const eventListener: EventListener = {
      eventType,
      listener,
      once: true,
    };

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(eventListener);
    this.localEmitter.once(eventType, listener);

    this.log(`One-time listener registered for event type: ${eventType}`, 'debug');

    // Return unsubscribe function
    return () => this.off(eventType, listener);
  }

  /**
   * Unsubscribe from events of a specific type
   * 
   * @param eventType - The type of event to unsubscribe from
   * @param listener - The callback function to remove
   */
  off(eventType: string, listener: (event: Event) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      const toRemove = Array.from(listeners).find(
        (l) => l.listener === listener
      );
      if (toRemove) {
        listeners.delete(toRemove);
        this.localEmitter.off(eventType, listener);
        this.log(`Listener removed for event type: ${eventType}`, 'debug');
      }
    }
  }

  /**
   * Remove all listeners for a specific event type or all listeners
   * 
   * @param eventType - Optional event type to clear. If not provided, clears all.
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.forEach((l) => {
          this.localEmitter.off(eventType, l.listener);
        });
        listeners.clear();
        this.listeners.delete(eventType);
      }
    } else {
      this.listeners.forEach((listeners, et) => {
        listeners.forEach((l) => {
          this.localEmitter.off(et, l.listener);
        });
      });
      this.listeners.clear();
    }

    this.log(`Listeners removed${eventType ? ` for ${eventType}` : ' for all events'}`, 'debug');
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get listener count for a specific event type
   */
  getListenerCount(eventType: string): number {
    return this.listeners.get(eventType)?.size || 0;
  }

  /**
   * Get all registered event types
   */
  getRegisteredEventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * Handle incoming message from Redis
   */
  private handleIncomingMessage(message: string): void {
    try {
      const event: Event = JSON.parse(message);

      // Check for deduplication
      if (this.config.enableDeduplication) {
        const cacheKey = this.getEventCacheKey(event);
        if (this.eventCache.has(cacheKey)) {
          return; // Skip duplicate events
        }
        this.eventCache.set(cacheKey, Date.now());
      }

      // Emit locally
      this.localEmitter.emit(event.eventType, event);
      this.log(`Event received from Redis: ${event.eventType}`, 'debug');
    } catch (error: any) {
      this.log(`Failed to parse incoming message: ${error.message}`, 'error');
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cache key for event deduplication
   */
  private getEventCacheKey(event: Event): string {
    return `${event.eventType}_${event.id}`;
  }

  /**
   * Clean up old event cache entries
   */
  private cleanupEventCache(): void {
    const now = Date.now();
    const ttl = this.config.deduplicationTtlMs!;

    for (const [key, timestamp] of this.eventCache.entries()) {
      if (now - timestamp > ttl) {
        this.eventCache.delete(key);
      }
    }
  }

  /**
   * Log event to database for audit trail
   */
  private async logEventToDatabase(event: Event): Promise<void> {
    try {
      await this.prisma.eventLog.create({
        data: {
          eventId: event.id,
          eventType: event.eventType,
          eventData: JSON.stringify(event.data),
          metadata: event.metadata ? JSON.stringify(event.metadata) : null,
          priority: event.priority,
          timestamp: event.timestamp,
          status: event.status,
        },
      });
    } catch (error: any) {
      this.log(`Failed to log event to database: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Setup error handlers for Redis clients
   */
  private setupErrorHandlers(): void {
    this.redisClient.on('error', (error: Error) => {
      this.log(`Redis client error: ${error.message}`, 'error');
      this.localEmitter.emit('error', error);
    });

    this.redisSubscriber.on('error', (error: Error) => {
      this.log(`Redis subscriber error: ${error.message}`, 'error');
      this.localEmitter.emit('error', error);
    });

    this.redisClient.on('reconnecting', () => {
      this.log('Redis client reconnecting...', 'warn');
    });

    this.redisClient.on('connect', () => {
      this.log('Redis client connected');
    });

    this.redisSubscriber.on('connect', () => {
      this.log('Redis subscriber connected');
    });
  }

  /**
   * Log message with level
   */
  private log(message: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info'): void {
    const prefix = '[EventBus]';
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'info':
        console.info(`${timestamp} ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${timestamp} ${prefix} ${message}`);
        break;
      case 'error':
        console.error(`${timestamp} ${prefix} ${message}`);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`${timestamp} ${prefix} ${message}`);
        }
        break;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.disconnect();
    this.removeAllListeners();
    this.eventCache.clear();
    await this.prisma.$disconnect();
    this.log('Event bus destroyed');
  }
}

/**
 * Create singleton event bus instance
 */
let eventBusInstance: EventBus | null = null;

export function getEventBus(config?: EventBusConfig): EventBus {
  if (!eventBusInstance) {
    if (!config) {
      throw new Error('EventBus config is required for first initialization');
    }
    eventBusInstance = new EventBus(config);
  }
  return eventBusInstance;
}

export function resetEventBus(): void {
  if (eventBusInstance) {
    eventBusInstance.destroy();
    eventBusInstance = null;
  }
}
