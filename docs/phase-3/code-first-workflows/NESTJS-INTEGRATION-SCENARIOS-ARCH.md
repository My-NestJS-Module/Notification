## Kiến Trúc Tích Hợp Code-First Workflows với NestJS

Tài liệu này mô tả **ở mức kiến trúc** hai kịch bản chính khi tích hợp `@novu/framework` (code-first workflows) với backend NestJS.

> Phần HOW-TO chi tiết (các bước cụ thể) sẽ nằm trong `docs/docs-notification/NESTJS-INTEGRATION-SCENARIOS.md`.

### 1. Scenario 1 – Serve Workflows trực tiếp từ Backend NestJS

#### 1.1. Ý tưởng

- Backend NestJS vừa:
  - Chứa `NotificationModule` (core) – dùng `@novu/api` để trigger workflow.
  - Vừa chứa layer code-first – dùng `@novu/framework` để expose định nghĩa workflows cho Novu.
- Phù hợp khi:
  - Hệ thống không quá lớn, muốn đơn giản hoá deployment.
  - Đội backend sở hữu luôn phần logic workflows.

#### 1.2. Kiến trúc (high-level)

```text
┌─────────────────────────────────────────┐
│            Application Services         │
│  (OrderService, UserService, ...)       │
└─────────────────────────┬───────────────┘
                          │
                          │ dùng
                          ▼
┌─────────────────────────────────────────┐
│           NotificationModule (core)     │
│  - NotificationService (Facade)         │
│  - sử dụng @novu/api                    │
└─────────────────────────┬───────────────┘
                          │ trigger
                          ▼
┌─────────────────────────────────────────┐
│               Novu Platform             │
└─────────────────────────┬───────────────┘
                          │ bridge
                          ▼
┌─────────────────────────────────────────┐
│   NestJS Code-First Workflows Module    │
│   - @novu/framework + workflows/        │
│   - expose endpoint /novu               │
└─────────────────────────────────────────┘
```

#### 1.3. Ưu / Nhược điểm

- **Ưu**:
  - Đơn giản hoá deployment: chỉ cần deploy một backend NestJS.
  - Dễ debugging vì cả core và workflows cùng một codebase & log stack.
- **Nhược**:
  - Tăng kích thước và độ phức tạp backend.
  - Khó scale workflows độc lập nếu lưu lượng tăng mạnh.

### 2. Scenario 2 – Deploy Workflows ở Service Riêng (Next.js/Node)

#### 2.1. Ý tưởng

- Backend NestJS:
  - Chỉ chứa `NotificationModule` (core).
  - Chỉ biết `workflowId` và dùng `@novu/api` để trigger.
- Service khác (Next.js/Node):
  - Chứa thư mục `workflows/` và định nghĩa code-first workflows.
  - Dùng `@novu/framework` để expose endpoints cho Novu.

#### 2.2. Kiến trúc (high-level)

```text
┌─────────────────────────────────────────┐
│           Backend NestJS (Core)         │
│  - NotificationModule (core)            │
│  - @novu/api                            │
└─────────────────────────┬───────────────┘
                          │ trigger
                          ▼
┌─────────────────────────────────────────┐
│              Novu Platform              │
└─────────────────────────┬───────────────┘
                          │ bridge
                          ▼
┌─────────────────────────────────────────┐
│    Workflows Service (Next.js/Node)     │
│  - @novu/framework                       │
│  - Thư mục workflows/ (code-first)      │
└─────────────────────────────────────────┘
```

#### 2.3. Ưu / Nhược điểm

- **Ưu**:
  - Decouple rõ ràng: backend core và workflows có thể phát triển, scale, deploy độc lập.
  - Phù hợp khi coi notification workflows là **một platform/service riêng**.
- **Nhược**:
  - Tăng số lượng service cần vận hành.
  - Cần bổ sung observability & monitoring giữa nhiều service.

### 3. Mối Quan Hệ Giữa NotificationModule và Workflows

- `NotificationModule`:
  - Chỉ cần biết `workflowId` (string) và payload để gửi.
  - Mapping tenant → Novu project/env nằm tại đây.
  - **Không** phụ thuộc `@novu/framework` và cũng không import file từ `workflows/`.
- Code-first workflows:
  - Được định nghĩa trong thư mục `workflows/` (ở service nào là tuỳ kiến trúc).
  - Phải đảm bảo `workflowId` trong code-first **khớp** với `workflowId` mà `NotificationModule` sử dụng.


