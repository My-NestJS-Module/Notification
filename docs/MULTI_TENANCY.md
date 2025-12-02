## Thiết Kế Multi-Tenant & Multi-Env cho Notification Module (Chiến lược 2)

> File này mô tả ở **mức kiến trúc** cách dùng NotificationModule trong bối cảnh multi-tenant, multi-env.  
> Hướng dẫn chi tiết cho project host nằm trong `docs/docs-notification/`.

### 1. Mục tiêu

- Cho phép **nhiều tenant (khách hàng / sản phẩm / brand)** dùng chung NotificationModule.
- Đảm bảo:
  - Có thể **tách biệt** dữ liệu & cấu hình giữa các tenant (khi cần).
  - Giữ NotificationModule **đơn giản, reusable**, không nhúng quá nhiều logic tenant routing.

Trong plan hiện tại, chúng ta chọn **chiến lược 2**:

- Mỗi tenant sử dụng **Novu project/env riêng** hoặc thậm chí **deployment backend riêng**.
- NotificationModule vẫn là **abstraction dùng lại được**, không trực tiếp route theo tenant.

---

### 2. Hai biến thể của chiến lược 2

#### 2.1. Biến thể 2A – Mỗi tenant một deployment backend (single-tenant per deploy)

- Mỗi tenant có:
  - 1 backend NestJS (hoặc nhiều service) **deploy riêng**.
  - 1 bộ env riêng:
    - `NOVU_API_KEY` (API key cho Novu project của tenant).
    - (Tuỳ chọn) `NOVU_SERVER_URL` (US/EU region,...).
- NotificationModule trong mỗi deployment:
  - Được cấu hình **như hệ thống single-tenant**, không biết gì về tenant khác.

Kiến trúc:

```text
Tenant A:
  Backend A (NestJS)  +  NotificationModule  -> Novu Project A

Tenant B:
  Backend B (NestJS)  +  NotificationModule  -> Novu Project B
```

Ưu điểm:

- Isolation rất cao (config, logs, data, traffic).
- Module core giữ nguyên, không cần thêm logic tenant.

Nhược điểm:

- Chi phí hạ tầng cao hơn (nhiều deployment).
- Quản lý & vận hành phức tạp hơn (CI/CD, config cho nhiều app).

#### 2.2. Biến thể 2B – Một backend, nhiều Novu project (ít phổ biến hơn)

- Một backend NestJS phục vụ **nhiều tenant**, nhưng:
  - Tuỳ `tenantId` sẽ gọi **different Novu API key / project**.
- Để làm được, cần một **lớp adapter/bridge** bên ngoài NotificationModule, ví dụ:

```text
Domain Service
   │ (tenantId, dto)
   ▼
TenantNovuClient (chọn API key / project phù hợp)
   │
   ├─> Novu Project A
   └─> Novu Project B
```

- NotificationModule có thể:
  - Vẫn dùng 1 `Novu` client duy nhất (1 API key).
  - Hoặc được sử dụng ở **lớp trên** (abstraction DTO + service), còn việc gọi nhiều Novu project sẽ do `TenantNovuClient` tự làm.

Do độ phức tạp cao và dễ gây nhầm lẫn, chiến lược 2B **nên được xem là nâng cao**, tuỳ công ty có yêu cầu đó hay không.

---

### 3. Vai trò của NotificationModule trong chiến lược 2

- NotificationModule:
  - Đọc các env:
    - `NOVU_API_KEY`
    - `NOVU_SERVER_URL` (tuỳ chọn).
  - Khởi tạo **một** client cho Novu.
  - Cung cấp các API thuần:
    - `sendNotification(dto)`
    - Subscriber APIs
    - Preferences APIs
    - (Optional) Workflow management APIs
- **Không**:
  - Không chứa logic chọn tenant.
  - Không xử lý nhiều API key cùng lúc.

Multi-tenant / multi-env thực tế sẽ được giải quyết bằng:

- Cách bạn **deploy & cấu hình env** (2A).
- Hoặc bằng **adapter ngoài core** (2B).

---

### 4. Multi-Env (dev/stage/prod) trong bối cảnh chiến lược 2

Trong mỗi env, bạn có thể kết hợp với chiến lược 2 như sau:

- Mỗi env có các biến:
  - `NOVU_API_KEY` (dev/stage/prod).
  - `NOVU_SERVER_URL` (tuỳ region).
- Nếu dùng biến thể 2A:
  - Ví dụ:
    - `tenantA-dev` dùng project Novu Dev A.
    - `tenantA-prod` dùng project Novu Prod A.
    - `tenantB-dev` dùng project Novu Dev B.
    - `tenantB-prod` dùng project Novu Prod B.
- Convention gợi ý:
  - Giữ **`workflowId` giống nhau** giữa các env (ví dụ `order-confirmation`), để code backend không phải đổi – chỉ env quyết định Novu project nào được gọi.

---

### 5. Khi nào nên chọn chiến lược 2?

Chiến lược 2 phù hợp khi:

- Bạn cần **isolation mạnh** giữa tenant:
  - Lý do security/compliance (GDPR, SOC2,...).
  - Muốn có thể tách/hạ tầng riêng cho mỗi khách hàng lớn.
- Bạn muốn:
  - Log/metrics/billing tách riêng theo tenant ở tầng Novu.
  - Khả năng tắt/bật từng tenant ở mức deploy/hạ tầng.

Nếu yêu cầu multi-tenant chỉ ở mức “nhiều brand/product dùng chung” và không cần isolation cao, chiến lược encode `tenantId` vào `workflowId` (chiến lược 1 trong thảo luận) có thể là lựa chọn đơn giản hơn – nhưng hiện tại plan đang đi theo chiến lược 2.

---

### 6. Mối quan hệ với docs cho project host

- File này (`docs/MULTI_TENANCY.md`) nói ở mức **kiến trúc module & hạ tầng**.
- Hướng dẫn cụ thể cho team tích hợp (ví dụ:
  - Cách set env cho từng tenant.
  - Cách deploy một backend per-tenant.
  - Hoặc cách xây adapter `TenantNovuClient`.  
  ) sẽ nằm trong `docs/docs-notification/` (ví dụ `MULTI_TENANT_INTEGRATION.md`).


