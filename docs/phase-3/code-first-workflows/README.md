## Code-First Workflows với `@novu/framework`

> **Mục tiêu**: Tài liệu này mô tả tổng thể Phase Code-First Workflows cho hệ thống notification, tập trung vào kiến trúc, tách layer, multi-tenant/multi-env, observability và governance/versioning.

### 1. Phạm vi

- **Không** thay đổi hành vi module core trong `src/notification`:
  - Core **chỉ** phụ thuộc `@novu/api`.
  - Không import bất kỳ file nào từ thư mục `workflows/`.
- **Thêm** một layer code-first workflows:
  - Được định nghĩa bằng `@novu/framework` + `zod`.
  - Chỉ đóng vai trò **sample / library pattern** trong repo này.
  - Layer thực chiến sẽ được wiring trong **project host** (NestJS/NextJS/Node service).

### 2. Cấu trúc thư mục tài liệu Code-First

Thư mục `docs/code-first-workflows/` gồm:

- `DESIGN-CODE-FIRST-LAYER.md`  
  Mô tả kiến trúc layer code-first, luồng dữ liệu, cách tách `NotificationModule` (core) khỏi `@novu/framework`.

- `WORKFLOW-PATTERNS-CODE-FIRST.md`  
  Mô tả chi tiết các pattern workflows code-first (Digest, Fallback Chain, A/B Testing, Rate Limiting, Conditional Branching) và mapping sang các file trong thư mục `workflows/`.

- `NESTJS-INTEGRATION-SCENARIOS-ARCH.md`  
  Trình bày 2 kịch bản tích hợp code-first workflows vào NestJS: (1) serve trực tiếp từ backend NestJS, (2) deploy workflows ở service riêng (Next.js/Node).

- `GOVERNANCE-AND-OBSERVABILITY.md`  
  Quy ước về `workflowId`, quản lý version, multi-tenant/multi-env, cùng với các guideline về log, metrics, tracing cho workflows.

### 3. Liên kết với docs hướng dẫn sử dụng module

- Thư mục `docs/` tập trung vào **kiến trúc & implement nội bộ** của module.
- Thư mục `docs/docs-notification/` chứa **tài liệu hướng dẫn import & tích hợp** module vào các dự án NestJS khác (how-to).

Các file how-to trong `docs/docs-notification/` sẽ tham chiếu lại các thiết kế ở đây để:

- Hướng dẫn cách **tổ chức thư mục `workflows/` trong project host**.
- Giải thích rõ **mối quan hệ giữa `NotificationModule` (trigger theo `workflowId`) và workflows code-first**.


