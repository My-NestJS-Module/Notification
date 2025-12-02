## WORKFLOW_PATTERNS – Patterns & Best Practices với Prometheus

---

### 1. Junior – Workflow cơ bản

- **Pattern: Monitoring cơ bản 1 service**
  - Bước 1: Chạy Prometheus (Docker/K8s).  
  - Bước 2: Cho service expose `/metrics` (hoặc dùng exporter).  
  - Bước 3: Thêm service vào `scrape_configs` trong `prometheus.yml`.  
  - Bước 4: Mở web UI Prometheus → tab **Graph** → chạy query đơn giản (`up`, `http_requests_total`).  
  - Bước 5: Cấu hình 1 alert đơn giản (VD: service down > 5 phút).

- **Best practice cơ bản**
  - Luôn có **environment label** (`env="dev" | "staging" | "prod"`).  
  - Đặt tên metric rõ ràng, có đơn vị: `*_seconds`, `*_bytes`, `*_total`.  
  - Không dùng Prometheus để lưu log text hoặc event rời rạc.

---

### 2. Middle – Workflow phổ biến

#### Pattern 1: Golden Signals Monitoring
- **Mục tiêu**: Áp dụng 4 Golden Signals (latency, traffic, errors, saturation).  
- **Workflow**:
  1. Instrument ứng dụng với counter & histogram (hoặc summary) cho HTTP request.  
  2. Tạo recording rules cho **request rate, error rate, latency P95/P99**.  
  3. Tạo dashboard hiển thị 4 Golden Signals.  
  4. Định nghĩa alert dựa trên SLO (VD: error rate > 1% trong 5m).

#### Pattern 2: Infrastructure & Node Health
- **Mục tiêu**: Theo dõi sức khỏe server/node.  
- **Workflow**:
  1. Deploy `node_exporter` trên tất cả host.  
  2. Thêm job `node_exporter` vào Prometheus.  
  3. Viết alert: high CPU, low disk, high memory usage, network saturation.  
  4. Gắn severity & routing khác nhau (warning/critical).

#### Pattern 3: Kubernetes Cluster Monitoring
- **Mục tiêu**: Theo dõi cluster, pod, deployment, cronjob.  
- **Workflow**:
  1. Deploy stack `Prometheus + kube-state-metrics + node_exporter + cAdvisor`.  
  2. Dùng **service discovery** (`kubernetes_sd_config`) thay vì static_configs.  
  3. Định nghĩa alert:  
     - Pod CrashLoopBackOff.  
     - Deployment không đủ replicas.  
     - Node NotReady.  
  4. Chuẩn hóa label: `cluster`, `namespace`, `app`, `component`.

#### Pattern 4: Database Monitoring
- **Mục tiêu**: Giám sát PostgreSQL/MySQL/Redis,...  
- **Workflow**:
  1. Deploy exporter tương ứng (postgres_exporter, redis_exporter…).  
  2. Lựa chọn subset metrics quan trọng (connection, latency, error, cache hit).  
  3. Tạo dashboard cho DB + alert cho connection full, slow query, replication lag.

---

### 3. Senior – Advanced patterns

#### Pattern 5: Recording Rules cho KPI & SLO
- **Vấn đề**: Query phức tạp, tốn tài nguyên, khó tái sử dụng.  
- **Giải pháp**: Dùng **recording rules** để tạo các time series đã được pre‑compute.  
- **Workflow**:
  1. Xác định KPI chính: `request_rate`, `error_rate`, `latency_p95`.  
  2. Viết recording rules:  
     - `job:http_requests_error_rate:ratio = ...`  
     - `job:http_request_duration_seconds:p95 = ...`  
  3. Sử dụng các metric đã record trong dashboard & alert (query sẽ nhẹ hơn, dễ đọc hơn).

#### Pattern 6: Multi‑tenant / Multi‑env monitoring
- **Vấn đề**: Một Prometheus monitor nhiều env/team → khó tách bạch.  
- **Giải pháp**:  
  - Chuẩn hóa label `env`, `team`, `service`.  
  - Dùng **Grafana folder & dashboard per team**.  
  - Phân quyền truy cập metric/dashboards nếu cần.

#### Pattern 7: Ephemeral jobs & batch (Pushgateway/Textfile collector)
- **Vấn đề**: Job chạy ngắn (cron, batch) không kịp bị Prometheus scrape.  
- **Giải pháp**:  
  - Dùng **Pushgateway** cho job “level service” (CI/CD pipeline, batch tổng).  
  - Dùng **textfile collector** của node_exporter cho job trên host.

#### Pattern 8: Federation & Remote Write
- **Vấn đề**: Nhiều cluster/region, cần tổng hợp metrics & lưu dài hạn.  
- **Giải pháp**:  
  - **Federation** để Prometheus cấp cao fetch metrics aggregate → view global.  
  - **Remote write** sang Thanos/Cortex/Mimir/VictoriaMetrics để:  
    - Lưu lâu dài.  
    - Query toàn hệ thống.

---

### 4. Principal – Best practices cấp tổ chức

#### Best practices chung
- **Thiết kế metrics đúng từ đầu**  
  - Có guideline đặt tên metric & label.  
  - Hạn chế label cardinality cao (user_id, request_id, random id…).  
  - Phân loại metric: **infra**, **app**, **business**, **platform**.

- **Governance & tiêu chuẩn hóa**  
  - Document **convention metrics & label** dùng chung toàn tổ chức.  
  - Tạo **template dashboard & alert** cho từng loại service (API, worker, DB, cache…).  
  - Review metrics & alert như **review code** (PR, code‑review).

- **Alerting strategy**  
  - Ưu tiên alert dựa trên **SLO & user impact** thay vì chỉ CPU/RAM.  
  - Thiết kế **multi‑level alert**: symptom → cause.  
  - Tránh alert flooding: dùng **inhibit, grouping, silence** trong Alertmanager.

- **Workflow Dev + SRE**  
  - Khi develop feature mới:  
    - Xác định **SLO/SLI** liên quan.  
    - Thêm/instrument metrics & alert tương ứng.  
    - Cập nhật dashboard.  
  - Monitoring là một phần của **definition of done**.

- **Automation & GitOps**  
  - Toàn bộ config Prometheus/Alertmanager/dashboard được lưu trong Git.  
  - Triển khai bằng GitOps (Argo CD/Flux) → dễ rollback, audit, review.  

---

### Tóm tắt theo cấp độ
- **Junior**: Nắm được workflow setup monitoring cơ bản cho 1 service.  
- **Middle**: Áp dụng các pattern phổ biến (Golden Signals, infra, K8s, DB).  
- **Senior**: Dùng recording rules, federation, remote write, multi‑tenant pattern.  
- **Principal**: Thiết kế chiến lược observability & governance cho toàn tổ chức dựa trên Prometheus.


