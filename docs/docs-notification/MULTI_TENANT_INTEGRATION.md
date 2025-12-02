## Hướng Dẫn Cho Project Host: Tích Hợp NotificationModule Trong Môi Trường Multi-Tenant / Multi-Env (Chiến lược 2)

> Đọc trước: `docs/MULTI_TENANCY.md` để hiểu kiến trúc chiến lược 2 ở mức tổng thể.  
> File này tập trung vào **cách áp dụng trong dự án NestJS cụ thể** khi import NotificationModule.

---

### 1. Trường hợp khuyến nghị: mỗi tenant một deployment backend (2A)

Đây là mô hình **đơn giản nhất** khi dùng NotificationModule theo chiến lược 2.

#### 1.1. Mỗi deployment = 1 tenant

Ví dụ:

- Tenant A:
  - Service: `tenant-a-backend`
  - Env:
    - `NOVU_API_KEY=NOVU_API_KEY_TENANT_A`
    - `NOVU_SERVER_URL` (nếu dùng region riêng)
- Tenant B:
  - Service: `tenant-b-backend`
  - Env:
    - `NOVU_API_KEY=NOVU_API_KEY_TENANT_B`
    - `NOVU_SERVER_URL` (nếu dùng region riêng)

Trong mỗi backend:

```ts
// app.module.ts (tenant-specific backend)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationModule.forRoot(), // dùng env của deployment hiện tại
    // ... các module khác
  ],
})
export class AppModule {}
```

NotificationModule:

- Đọc `NOVU_API_KEY` & `NOVU_SERVER_URL` từ env hiện tại.
- Gửi mọi notification cho **Novu Project riêng của tenant đó**.

Bạn **không cần** chuyền `tenantId` vào NotificationModule trong mô hình này – vì mỗi app đã đại diện cho 1 tenant.

#### 1.2. Multi-env cho mỗi tenant

Thông thường, mỗi tenant sẽ có nhiều env:

- `tenantA-dev`, `tenantA-stage`, `tenantA-prod`

Bạn chỉ cần:

- Cấu hình env tương ứng:

```env
# tenantA-dev
NOVU_API_KEY=NOVU_API_KEY_TENANT_A_DEV

# tenantA-prod
NOVU_API_KEY=NOVU_API_KEY_TENANT_A_PROD
```

- Giữ `workflowId` giống nhau giữa các env:
  - Ví dụ: `order-confirmation`, `comment-digest`, ...

Như vậy, code backend cho tenant A **không phải đổi** khi deploy giữa dev/stage/prod – chỉ đổi env.

---

### 2. Trường hợp nâng cao: một backend, nhiều Novu project (2B)

> Cảnh báo: mô hình này phức tạp, chỉ nên dùng khi thực sự cần.  
> Bạn sẽ phải tự xây **adapter** để routing theo tenant.

Ý tưởng:

- Backend nhận `tenantId` (từ JWT, header, subdomain, ...).
- Dựa vào `tenantId`, chọn:
  - API key / project Novu tương ứng.
  - Region (`NOVU_SERVER_URL`) nếu khác nhau.
- Gọi Novu **trực tiếp** qua REST API hoặc nhiều instance client.

Pseudo-code:

```ts
// tenant-novu.config.ts
export const TENANT_NOVU_CONFIG = {
  tenantA: {
    apiKey: process.env.TENANT_A_NOVU_API_KEY,
    serverUrl: process.env.TENANT_A_NOVU_SERVER_URL,
  },
  tenantB: {
    apiKey: process.env.TENANT_B_NOVU_API_KEY,
    serverUrl: process.env.TENANT_B_NOVU_SERVER_URL,
  },
} as const;
```

```ts
// tenant-novu.client.ts (project host, ngoài module core)
import { Novu } from '@novu/api';

export class TenantNovuClient {
  private clients = new Map<string, Novu>();

  constructor(private readonly config = TENANT_NOVU_CONFIG) {}

  private getClient(tenantId: string): Novu {
    if (!this.clients.has(tenantId)) {
      const tenantCfg = this.config[tenantId];
      if (!tenantCfg?.apiKey) {
        throw new Error(`No Novu config for tenant ${tenantId}`);
      }
      const novu = new Novu({
        secretKey: tenantCfg.apiKey,
        serverUrl: tenantCfg.serverUrl,
      });
      this.clients.set(tenantId, novu);
    }

    return this.clients.get(tenantId)!;
  }

  async triggerForTenant(tenantId: string, payload: {
    workflowId: string;
    to: any;
    data: Record<string, any>;
  }) {
    const novu = this.getClient(tenantId);
    return novu.trigger({
      workflowId: payload.workflowId,
      to: payload.to,
      payload: payload.data,
    });
  }
}
```

Trong mô hình này:

- Bạn có thể:
  - Dùng `TenantNovuClient` **song song** với NotificationModule (cho những luồng đặc biệt multi-tenant).
  - Hoặc dần dần trừu tượng hoá lại NotificationModule để sử dụng `TenantNovuClient` ở bên dưới (việc này tuỳ thuộc vào kiến trúc và không nằm trong scope library hiện tại).

---

### 3. Khuyến nghị áp dụng

Tóm lại:

- **Nếu có thể**: dùng **biến thể 2A** – mỗi tenant một deployment/backend riêng:
  - NotificationModule sử dụng đúng 1 API key cho mỗi app.
  - Đơn giản, dễ hiểu, phù hợp multi-tenant kiểu enterprise B2B.
- **Chỉ dùng 2B** khi**:
  - Bạn muốn một backend dùng chung cho nhiều tenant *và* mỗi tenant thật sự cần Novu project riêng.
  - Bạn chấp nhận xây adapter riêng như `TenantNovuClient`.

NotificationModule trong library này đã được thiết kế:

- Không chứa logic tenant.
- Hoàn toàn tương thích với cả 2A và 2B, miễn là bạn:
  - Cấu hình env/deployment đúng.
  - Hoặc xây adapter riêng khi cần.


