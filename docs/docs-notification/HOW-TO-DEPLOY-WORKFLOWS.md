## Hướng Dẫn Deploy Workflows Code-First với Novu

> Tài liệu này hướng dẫn các cách phổ biến để deploy workflows code-first  
> (dùng `@novu/framework`) cho hệ thống notification.

### 1. Kiến thức nền tảng

- Đọc trước:
  - `docs/code-first-workflows/DESIGN-CODE-FIRST-LAYER.md`
  - `docs/code-first-workflows/NESTJS-INTEGRATION-SCENARIOS-ARCH.md`
- Tham khảo docs chính thức Novu Framework (truy cập 2024-09):
  - **Novu Framework – Getting Started**:  
    `https://docs.novu.co/framework/getting-started`
  - **Novu Framework Client with Next.js** (ví dụ code):  
    `https://github.com/novuhq/docs/blob/main/content/docs/framework/typescript/client.mdx`

---

### 2. Deploy cùng Backend NestJS

#### 2.1. Mô hình

- Backend NestJS chứa cả:
  - `NotificationModule` (core) – dùng `@novu/api`.
  - Module workflows – dùng `@novu/framework`.
- Ưu điểm:
  - Một ứng dụng, dễ deploy/monitor.
  - Thích hợp cho team nhỏ hoặc hệ thống chưa quá phức tạp.

#### 2.2. Các bước chính

1. **Copy workflows**:
   - Từ thư mục `workflows/` của repo library vào `src/notification-workflows/` (hoặc tên tương tự) trong project NestJS.

2. **Wiring module workflows**:
   - Tạo `NotificationWorkflowsModule` như đã minh hoạ trong  
     `docs/docs-notification/NESTJS-INTEGRATION-SCENARIOS.md`.

3. **Expose endpoint cho Novu**:
   - Dựa trên docs `@novu/framework`, tạo một bridge phù hợp với NestJS
     (ví dụ: sử dụng `NovuRequestHandler` để xử lý request và đăng ký route trong controller).

4. **Triển khai**:
   - Deploy backend NestJS lên môi trường (Docker/K8s/vm,… như bình thường).
   - Cấu hình Novu để trỏ đến endpoint workflows của backend (ví dụ `/novu`).

---

### 3. Deploy dưới dạng Service Riêng (Next.js/Node)

#### 3.1. Mô hình

- Backend NestJS chỉ chứa Notification core.
- Service workflows riêng (Next.js/Node) chứa thư mục `workflows/` và `serve()` từ `@novu/framework`.
- Ưu điểm:
  - Decouple rõ ràng giữa business backend và notification workflows.
  - Dễ scale workflows độc lập.

#### 3.2. Ví dụ với Next.js

1. **Cấu trúc dự án**:

```text
apps/backend/           # NestJS, NotificationModule core
apps/notification-fw/   # Next.js, code-first workflows
  app/api/novu/route.ts
  src/notification-workflows/
```

2. **Khai báo route handler**:

- Xem ví dụ chi tiết trong  
  `docs/docs-notification/NESTJS-INTEGRATION-SCENARIOS.md` – mục Next.js.

3. **Triển khai**:

- Deploy app Next.js (Vercel, Docker, K8s, ...).
- Cấu hình Novu để sử dụng endpoint `/api/novu` của app này làm bridge cho workflows.
- Backend NestJS chỉ trigger workflows qua `@novu/api` với `workflowId`.

---

### 4. Đồng bộ với Novu (Governance & Versioning)

- Khi deploy workflows mới hoặc thay đổi version:
  - Đảm bảo `workflowId` được cập nhật đúng theo quy ước:
    - Xem `docs/code-first-workflows/GOVERNANCE-AND-OBSERVABILITY.md`.
  - Đảm bảo `NotificationModule` sử dụng đúng `workflowId`:
    - Nếu chuyển từ `*.v1` sang `*.v2`, cần cập nhật code phía backend (hoặc config) tương ứng.

- Quản lý thông qua Git:
  - Mỗi thay đổi workflows đi kèm PR riêng.
  - Tag/release để dễ rollback.

---

### 5. Multi-Env / Multi-Region

- **Multi-env** (dev/stg/prod):
  - Nên tách:
    - Biến môi trường cho Novu (API key, serverURL).
    - Endpoint workflows (URL service Next.js/NestJS).
  - Không hard-code env vào workflows.

- **Multi-region**:
  - Với hệ thống lớn, có thể:
    - Deploy service workflows ở nhiều region.
    - Mỗi region dùng project/env riêng trong Novu.
  - Notification core cần mapping:
    - `tenantId` → `region` → `Novu project/env` → `workflows endpoint`.

---

### 6. Checklist trước khi deploy

- [ ] Workflows mới đã có `workflowId` đúng quy ước và version.
- [ ] Notification core đã được cập nhật (nếu cần) để sử dụng `workflowId` mới.
- [ ] Đã verify payload (`payloadSchema`) khớp với dữ liệu từ backend.
- [ ] Đã có logging cơ bản cho `workflowId`, `tenantId`, `channel`, `stepId`.
- [ ] Đã test tối thiểu (unit/integration) cho các workflows quan trọng.


