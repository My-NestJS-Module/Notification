/**
 * MẪU ENTITY/MODEL CHO NOTIFICATION LOG
 *
 * File này là ví dụ mẫu cho project host. Project host cần:
 * 1. Copy và tùy chỉnh theo ORM của họ (TypeORM, Prisma, Mongoose, v.v.)
 * 2. Tạo migration để tạo bảng trong database
 * 3. Implement NotificationStatusIRepository interface
 *
 * Các ví dụ dưới đây cho TypeORM và Prisma.
 */

// ============================================
// VÍ DỤ 1: TypeORM Entity
// ============================================

/*
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { NotificationLog } from '../../src/notification/interfaces';

@Entity('notification_logs')
@Index(['externalId'], { unique: true }) // Idempotency
@Index(['subscriberId'])
@Index(['workflowId'])
@Index(['status'])
@Index(['occurredAt'])
export class NotificationLogEntity implements NotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  externalId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workflowId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stepId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  channel: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subscriberId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  providerId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  messageId: string | null;

  @Column({ type: 'timestamp' })
  occurredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @Column({ type: 'jsonb', nullable: true })
  raw: Record<string, any> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  correlationId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
*/

// ============================================
// VÍ DỤ 2: Prisma Schema
// ============================================

/*
// schema.prisma
model NotificationLog {
  id            String   @id @default(uuid())
  externalId    String   @unique @db.VarChar(255)
  workflowId    String?  @db.VarChar(255)
  stepId        String?  @db.VarChar(255)
  channel       String?  @db.VarChar(50)
  status        String?  @db.VarChar(50)
  subscriberId  String?  @db.VarChar(255)
  providerId    String?  @db.VarChar(100)
  messageId     String?  @db.VarChar(255)
  occurredAt    DateTime
  metadata      Json?
  raw           Json?
  tenantId      String?  @db.VarChar(255)
  transactionId String?  @db.VarChar(255)
  correlationId String?  @db.VarChar(255)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([subscriberId])
  @@index([workflowId])
  @@index([status])
  @@index([occurredAt])
  @@map("notification_logs")
}
*/

// ============================================
// VÍ DỤ 3: Mongoose Schema
// ============================================

/*
import { Schema, model, Document } from 'mongoose';
import { NotificationLog } from '../../src/notification/interfaces';

interface NotificationLogDocument extends NotificationLog, Document {}

const NotificationLogSchema = new Schema<NotificationLogDocument>(
  {
    externalId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    workflowId: { type: String, index: true },
    stepId: String,
    channel: String,
    status: { type: String, index: true },
    subscriberId: { type: String, index: true },
    providerId: String,
    messageId: String,
    occurredAt: { type: Date, required: true, index: true },
    metadata: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    tenantId: String,
    transactionId: String,
    correlationId: String,
  },
  {
    timestamps: true,
    collection: 'notification_logs',
  },
);

export const NotificationLogModel = model<NotificationLogDocument>(
  'NotificationLog',
  NotificationLogSchema,
);
*/

// ============================================
// VÍ DỤ 4: SQL Migration (PostgreSQL)
// ============================================

/*
-- Migration: Create notification_logs table

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255) NOT NULL UNIQUE,
  workflow_id VARCHAR(255),
  step_id VARCHAR(255),
  channel VARCHAR(50),
  status VARCHAR(50),
  subscriber_id VARCHAR(255),
  provider_id VARCHAR(100),
  message_id VARCHAR(255),
  occurred_at TIMESTAMP NOT NULL,
  metadata JSONB,
  raw JSONB,
  tenant_id VARCHAR(255),
  transaction_id VARCHAR(255),
  correlation_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_notification_logs_subscriber_id ON notification_logs(subscriber_id);
CREATE INDEX idx_notification_logs_workflow_id ON notification_logs(workflow_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_occurred_at ON notification_logs(occurred_at);
CREATE UNIQUE INDEX idx_notification_logs_external_id ON notification_logs(external_id);
*/

