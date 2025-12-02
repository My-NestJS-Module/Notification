## Tổng quan Prometheus (4 cấp độ)

### 1. Junior
- **Prometheus là gì?**  
  - Hệ thống **monitoring & alerting mã nguồn mở** dùng để thu thập metrics (số liệu dạng số theo thời gian – time series).  
  - Lưu trữ metrics trong **time series database** riêng, có ngôn ngữ truy vấn **PromQL**.  
  - Dùng để **giám sát hệ thống, service, container, Kubernetes, database…** và bắn cảnh báo khi có sự cố.
- **Khi nào nên dùng Prometheus?**  
  - Cần theo dõi **CPU, RAM, Disk, network, request count, error rate, latency…** theo thời gian.  
  - Hệ thống có nhiều service (microservices, container, Kubernetes) và cần **dashboard & alert**.  
  - Muốn dùng **stack phổ biến: Prometheus + Alertmanager + Grafana**.
- **Prometheus giải quyết vấn đề gì?**  
  - Trước đây: log/metrics rời rạc, khó tổng hợp, khó alert.  
  - Prometheus cung cấp **1 nơi tập trung** để thu thập, lưu trữ, query metrics và định nghĩa rule alert.

### 2. Middle
- **Đặc điểm kỹ thuật chính**  
  - **Data model đa chiều**: metric có `name` + nhiều `label` (key=value) → dễ filter/aggregate (ví dụ: theo `service`, `instance`, `status_code`, `env`…).  
  - **Pull model**: Prometheus **chủ động “scrape”** HTTP endpoint `/metrics` của target theo chu kỳ (thay vì target push trực tiếp).  
  - **PromQL**: ngôn ngữ query mạnh mẽ cho time series (rate, sum, avg, histogram_quantile, …).  
  - **Alerting**: Prometheus evaluate rule, gửi alert sang **Alertmanager** để gửi Slack/Email/PagerDuty,...
- **Khi nào Prometheus phù hợp**  
  - Hệ thống **cloud‑native, Kubernetes, microservices** với số lượng service biến động.  
  - Cần **monitor “golden signals”** (latency, traffic, errors, saturation).  
  - Cần **tự vận hành on‑prem / tự quản lý**, không phụ thuộc SaaS.
- **Khi nào Prometheus không phải lựa chọn tốt nhất**  
  - Cần **tracking cực kỳ chính xác cho billing/finance/audit** (Prometheus ưu tiên availability hơn là độ chính xác tuyệt đối từng sample).  
  - Cần **lưu dữ liệu rất dài hạn (vài năm)** với khối lượng cực lớn mà không dùng remote storage (Prometheus local TSDB thường giữ vài tuần).  
  - Cần **tracing/logging**: Prometheus tập trung vào **metrics**, không thay thế hệ thống log hoặc tracing.

### 3. Senior
- **Kiến trúc & vấn đề giải quyết**  
  - Mỗi **Prometheus server**:  
    - Scrape nhiều target (service, exporter).  
    - Lưu trữ metrics **local TSDB** (block + WAL, query nhanh).  
    - Evaluate **recording rules** (pre‑compute KPI) và **alerting rules**.  
  - Vấn đề trước Prometheus:  
    - Tool cũ như **StatsD + Graphite** hạn chế về **multi‑dimensional labels** và **PromQL‑like query**.  
    - Khó scale trong môi trường **dynamic infrastructure (Kubernetes, auto‑scaling)**.  
  - Prometheus giải quyết:  
    - **Service discovery** tích hợp Kubernetes, cloud provider → tự động phát hiện target.  
    - **Label‑based data model** + PromQL → linh hoạt query, dễ nhóm theo nhiều chiều.  
    - **Đơn giản vận hành**: 1 binary Go, không cần cluster phức tạp (cho đến khi scale lớn).
- **Khi nào nên kết hợp thêm hệ thống khác**  
  - Khi cần **long‑term retention & global view**: dùng `remote_write` sang **Thanos, Cortex, Mimir, VictoriaMetrics…**  
  - Khi cần **tracing/logs**: kết hợp với **OpenTelemetry, Jaeger, Tempo, Loki, ELK, Better Stack…**

### 4. Principal
- **Góc nhìn kiến trúc & chiến lược observability**  
  - Prometheus là **trụ cột metrics** trong stack observability 3 trụ: **Logs – Metrics – Traces**.  
  - Thiết kế hệ thống monitoring cần:  
    - **SLA/SLO/SLI** rõ ràng (ví dụ: error rate, latency P95, availability…).  
    - Quy hoạch **metrics chuẩn hóa**, tránh label cardinality bùng nổ.  
    - Cân nhắc **federation, sharding, remote storage** khi quy mô lớn (multi‑cluster, multi‑region).  
  - Prometheus giải quyết bài toán:  
    - **Observable infrastructure & services**: nhìn được tình trạng hệ thống theo thời gian, đa chiều.  
    - **Tự chủ vận hành**: không khoá vào vendor, phù hợp chiến lược multi‑cloud/hybrid.  
    - **Ecosystem CNCF**: dễ tích hợp với Kubernetes, service mesh, log/tracing backend, GitOps.

---

## Quick start (tóm tắt)
- **Junior**: Hiểu Prometheus là gì, dùng để giám sát gì, xem được dashboard & alert.  
- **Middle**: Biết cấu hình `prometheus.yml`, hiểu pull model, exporter, Alertmanager, PromQL cơ bản.  
- **Senior**: Thiết kế kiến trúc Prometheus cho 1 hệ thống/cluster, define metrics chuẩn, rule & dashboard cho SLO.  
- **Principal**: Thiết kế **observability platform** dựa trên Prometheus (multi‑cluster, remote storage, policy, best practices toàn tổ chức).


