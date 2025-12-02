## Kiến trúc Prometheus (4 cấp độ)

---

### 1. Junior – Overview đơn giản
- **Tổng quan kiến trúc**  
  - Một **Prometheus server**:  
    - Định kỳ gọi HTTP GET tới các endpoint `/metrics`.  
    - Lưu dữ liệu metrics vào **time series database** nội bộ.  
    - Cho phép xem metrics và chạy query qua **web UI** (mặc định port 9090).  
  - **Exporter**: chương trình nhỏ thu thập số liệu từ hệ điều hành / database / service… rồi expose ra `/metrics`.  
  - **Alertmanager**: nhận alert từ Prometheus và gửi thông báo (Slack, email,…).  
  - **Grafana** (hoặc tool khác): đọc dữ liệu từ Prometheus để vẽ dashboard.

- **Cấu trúc thư mục (ở mức conceptual)**  
  - `prometheus.yml`: file cấu hình chính (scrape_configs, alerting, rule_files).  
  - `rules/*.yml`: recording rules & alerting rules.  
  - `exporters/`: cấu hình các exporter như node_exporter, postgres_exporter,...  
  - `dashboards/`: (thường nằm ở Grafana hoặc dưới dạng JSON/YAML).

- **Dependencies & ENV cơ bản**  
  - Chạy được trên Linux, Docker, Kubernetes.  
  - Port mặc định: `9090` cho Prometheus, `9093` cho Alertmanager, `9100` cho node_exporter (thường dùng).  
  - Thường config qua file, không phụ thuộc quá nhiều vào ENV, nhưng có thể dùng ENV để inject đường dẫn config, retention time, v.v.

---

### 2. Middle – Kiến trúc lớp & luồng hoạt động

#### Kiến trúc lớp
- **Lớp thu thập dữ liệu (Scraping Layer)**  
  - Prometheus server scrape nhiều loại target:  
    - Application đã instrument Prometheus client.  
    - Exporter (node_exporter, postgres_exporter, redis_exporter,…).  
    - Kubernetes component (kubelet, API server) thông qua service discovery.

- **Lớp lưu trữ (Storage / TSDB Layer)**  
  - Prometheus TSDB:  
    - Lưu dữ liệu theo **block** (mặc định block ~2h).  
    - Dùng **WAL (Write Ahead Log)** để đảm bảo recovery sau crash.  
    - Hỗ trợ retention theo thời gian/size (`--storage.tsdb.retention.time`, `--storage.tsdb.retention.size`).

- **Lớp truy vấn & rule (Query & Rule Engine Layer)**  
  - **PromQL Engine**: thực thi query.  
  - **Recording rules**: pre‑compute các chỉ số hay dùng (VD: `rate(http_requests_total[5m])` thành metric mới).  
  - **Alerting rules**: định nghĩa điều kiện alert (VD: error rate > 5% trong 10m).

- **Lớp alerting (Alerting Layer)**  
  - Prometheus evaluate alert → gửi event sang **Alertmanager**.  
  - Alertmanager: group, dedupe, route đến Slack/Email/PagerDuty/webhook.

- **Lớp visualization (Dashboard Layer)**  
  - Chủ yếu dùng **Grafana** hoặc các UI khác kết nối Prometheus bằng HTTP API.

#### Luồng hoạt động cơ bản
1. Target/Exporter expose metrics ở `/metrics`.  
2. Prometheus server đọc `prometheus.yml` → tìm danh sách target (static_configs / service discovery).  
3. Định kỳ (scrape_interval) gửi HTTP GET tới `/metrics` → parse text → lưu vào TSDB.  
4. Người dùng / hệ thống khác query PromQL qua HTTP API hoặc web UI.  
5. Alerting rules được evaluate → khi vi phạm điều kiện → gửi alert sang Alertmanager → Alertmanager gửi notification.

---

### 3. Senior – Luồng dữ liệu, DTO/struct và 5 use case

#### Luồng dữ liệu (DTOs, data structures – conceptual)
- **Metric data model**  
  - **Time series**:  
    - `metric_name`: ví dụ `http_requests_total`.  
    - `labels`: tập key/value, ví dụ: `method="GET"`, `status="200"`, `service="user-api"`.  
    - `samples`: cặp `(timestamp, value)`.
- **Các metric type chính**  
  - `Counter`, `Gauge`, `Histogram`, `Summary`.  
  - Trong storage, mỗi combination `metric_name + labels` là **1 time series** riêng.

#### 5 use case thực tế
1. **Giám sát hạ tầng Linux server**  
   - Dùng `node_exporter` để expose CPU, RAM, Disk, Network.  
   - Use case: phát hiện server CPU > 90% trong 5 phút, hoặc disk > 80%.

2. **Monitoring microservices / API Gateway**  
   - Mỗi service instrument metrics: request count, latency, error rate.  
   - Viết PromQL alert: error rate > 5% trong 10 phút → gửi alert cho devops.

3. **Monitoring Kubernetes cluster**  
   - Dùng `kube-state-metrics`, `cadvisor`, `node_exporter`.  
   - Use case: phát hiện pod CrashLoopBackOff, node không còn tài nguyên, deployment không đủ replicas.

4. **Giám sát database (PostgreSQL, MySQL, Redis…)**  
   - Exporter chuyên biệt (postgres_exporter, redis_exporter...).  
   - Use case: connection count, query latency, replication lag, cache hit ratio.

5. **Business metrics / SLO**  
   - Tự định nghĩa metrics: `orders_total`, `signup_total`, `payment_failed_total`, v.v.  
   - Theo dõi SLO: tỷ lệ request thành công ≥ 99%, thời gian xử lý đơn hàng P95 < X giây.

---

### 4. Principal – Kiến trúc mở rộng & triển khai tổ chức

#### Mô hình triển khai ở quy mô lớn
- **Per‑cluster Prometheus + remote storage**  
  - Mỗi cluster (hoặc region) có Prometheus riêng, scrape local target → đảm bảo **tính độc lập & resilience**.  
  - Gửi metrics sang backend như **Thanos, Cortex/Mimir, VictoriaMetrics** qua `remote_write` để:  
    - Lưu trữ dài hạn.  
    - Có **global query** trên nhiều cluster.

- **Federation**  
  - Sử dụng `/federate` để Prometheus cấp cao hơn fetch các metric đã được aggregate từ Prometheus cấp dưới.  
  - Tối ưu cho view tổng hợp (SLO toàn hệ thống, multi‑region, multi‑env).

- **Tổ chức code & cấu hình (gợi ý cấu trúc repo)**  
  - `prometheus/`  
    - `prometheus.yml` – config core.  
    - `rules/` – recording/alerting rules phân nhóm theo domain (infra, app, db, business).  
    - `filesd/` hoặc `sd/` – file service discovery nếu không dùng K8s.  
  - `alertmanager/`  
    - `alertmanager.yml` – route, receiver, inhibition rules.  
  - `dashboards/`  
    - `infra/`, `apps/`, `business/` – JSON/YAML cho Grafana.  
  - Tất cả **đặt trong Git**, managed bằng **GitOps** (Argo CD / FluxCD).

#### Hướng dẫn tái sử dụng & mở rộng (tổng quan)
- **Tái sử dụng**  
  - Chuẩn hóa naming convention metric & label → tái sử dụng dashboard/alert giữa nhiều service.  
  - Đóng gói exporter & config thành **Helm chart / Kustomize / Terraform module**.
- **Mở rộng**  
  - Khi số lượng metrics tăng mạnh:  
    - Giảm scrape_interval cho các metric không critical.  
    - Tối ưu label cardinality, bỏ các label có giá trị gần như unique (user_id, request_id…).  
    - Tách Prometheus theo domain (infra, app, edge…) nếu cần.

---

### Ví dụ code/triển khai (high‑level)

> **Lưu ý**: Phần code chi tiết, ví dụ PromQL, cấu hình `prometheus.yml`, `alertmanager.yml`, Docker/Kubernetes… sẽ được trình bày sâu hơn trong `Implement_Guide.md`.


