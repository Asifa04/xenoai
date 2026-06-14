import {
  pgTable, text, timestamp, doublePrecision, integer, json, pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

export const campaignStatusEnum = pgEnum('campaign_status', ['DRAFT', 'RUNNING', 'COMPLETED', 'FAILED']);
export const communicationStatusEnum = pgEnum('communication_status', ['QUEUED', 'SENT', 'DELIVERED', 'OPENED', 'READ', 'CLICKED', 'FAILED']);

export const customers = pgTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  city: text('city'),
  gender: text('gender'),
  signupDate: timestamp('signup_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  customerId: text('customer_id').notNull().references(() => customers.id),
  orderAmount: doublePrecision('order_amount').notNull(),
  orderDate: timestamp('order_date').notNull(),
  products: json('products').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const segments = pgTable('segments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  description: text('description'),
  rules: json('rules').notNull(),
  aiPrompt: text('ai_prompt'),
  size: integer('size').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  segmentId: text('segment_id').notNull().references(() => segments.id),
  channel: text('channel').notNull(),
  message: text('message').notNull(),
  status: campaignStatusEnum('status').default('DRAFT').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  completedAt: timestamp('completed_at'),
});

export const communications = pgTable('communications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id),
  customerId: text('customer_id').notNull().references(() => customers.id),
  channel: text('channel').notNull(),
  message: text('message').notNull(),
  status: communicationStatusEnum('status').default('QUEUED').notNull(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  readAt: timestamp('read_at'),
  clickedAt: timestamp('clicked_at'),
  failedAt: timestamp('failed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const communicationEvents = pgTable('communication_events', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  communicationId: text('communication_id').notNull().references(() => communications.id),
  event: text('event').notNull(),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaignAnalytics = pgTable('campaign_analytics', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().unique().references(() => campaigns.id),
  totalSent: integer('total_sent').default(0).notNull(),
  delivered: integer('delivered').default(0).notNull(),
  failed: integer('failed').default(0).notNull(),
  opened: integer('opened').default(0).notNull(),
  read: integer('read').default(0).notNull(),
  clicked: integer('clicked').default(0).notNull(),
  conversions: integer('conversions').default(0).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  communications: many(communications),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
}));

export const segmentsRelations = relations(segments, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  segment: one(segments, { fields: [campaigns.segmentId], references: [segments.id] }),
  communications: many(communications),
  analytics: one(campaignAnalytics, { fields: [campaigns.id], references: [campaignAnalytics.campaignId] }),
}));

export const communicationsRelations = relations(communications, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [communications.campaignId], references: [campaigns.id] }),
  customer: one(customers, { fields: [communications.customerId], references: [customers.id] }),
  events: many(communicationEvents),
}));

export const communicationEventsRelations = relations(communicationEvents, ({ one }) => ({
  communication: one(communications, { fields: [communicationEvents.communicationId], references: [communications.id] }),
}));

export const campaignAnalyticsRelations = relations(campaignAnalytics, ({ one }) => ({
  campaign: one(campaigns, { fields: [campaignAnalytics.campaignId], references: [campaigns.id] }),
}));
