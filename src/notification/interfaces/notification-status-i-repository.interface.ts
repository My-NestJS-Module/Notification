import { NotificationLog, CreateNotificationLogDto } from './notification-log.interface';

/**
 * Interface tối thiểu cho NotificationStatusIRepository/NotificationLogPort.
 * Project host cần implement interface này với ORM của họ (TypeORM, Prisma, Mongoose, v.v.).
 *
 * Mục đích: Cho phép module core hoặc service mẫu có thể inject repository này
 * mà không phụ thuộc vào implementation cụ thể.
 */
export interface NotificationStatusIRepository {
  /**
   * Lưu notification log mới.
   * Nên xử lý idempotency (unique constraint trên externalId).
   *
   * @param dto - DTO chứa thông tin log
   * @returns NotificationLog đã lưu
   */
  save(dto: CreateNotificationLogDto): Promise<NotificationLog>;

  /**
   * Tìm log theo externalId (để check idempotency).
   *
   * @param externalId - ID event từ Novu
   * @returns NotificationLog hoặc null nếu không tìm thấy
   */
  findByExternalId(externalId: string): Promise<NotificationLog | null>;

  /**
   * Tìm logs theo subscriberId.
   *
   * @param subscriberId - Subscriber ID
   * @param limit - Số lượng kết quả tối đa
   * @param offset - Offset cho pagination
   * @returns Mảng NotificationLog
   */
  findBySubscriberId(
    subscriberId: string,
    limit?: number,
    offset?: number,
  ): Promise<NotificationLog[]>;

  /**
   * Tìm logs theo workflowId.
   *
   * @param workflowId - Workflow ID
   * @param limit - Số lượng kết quả tối đa
   * @param offset - Offset cho pagination
   * @returns Mảng NotificationLog
   */
  findByWorkflowId(
    workflowId: string,
    limit?: number,
    offset?: number,
  ): Promise<NotificationLog[]>;

  /**
   * Tìm logs theo status.
   *
   * @param status - Trạng thái (DELIVERED, BOUNCED, ...)
   * @param limit - Số lượng kết quả tối đa
   * @param offset - Offset cho pagination
   * @returns Mảng NotificationLog
   */
  findByStatus(
    status: string,
    limit?: number,
    offset?: number,
  ): Promise<NotificationLog[]>;
}

