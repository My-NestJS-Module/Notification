## Implement_Guide – Hướng dẫn triển khai Prometheus (4 cấp độ)

---

### 1. Junior – Triển khai nhanh 1 Prometheus + 1 exporter

> Mục tiêu: chạy được Prometheus, scrape được 1 target, xem được metrics & alert đơn giản.

- **Bước 1 – Chạy Prometheus bằng Docker (ví dụ đơn giản)**  
```bash
docker run -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

- **Bước 2 – File `prometheus.yml` tối giản**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "self"
    static_configs:
      - targets: ["localhost:9090"]
```

- **Bước 3 – Thêm 1 exporter (ví dụ node_exporter)**
```bash
docker run -p 9100:9100 prom/node-exporter
```

Thêm job vào `prometheus.yml`:
```yaml
scrape_configs:
  - job_name: "self"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "node"
    static_configs:
      - targets: ["host.docker.internal:9100"] # hoặc IP/host tương ứng
```

- **Bước 4 – Kiểm tra**  
  - Mở `http://localhost:9090/targets` xem job `node` có trạng thái `UP`.  
  - Vào tab **Graph**, chạy query: `node_load1`, `up`, `process_cpu_seconds_total`.

---

### 2. Middle – Best practices cho từng “kênh” monitoring

#### 2.1. Monitoring hạ tầng (server, VM, bare metal)
- **Thành phần chính**  
  - `node_exporter` trên mỗi host.  
  - Prometheus server scrape tất cả `node_exporter`.  
  - Alertmanager gửi cảnh báo.

- **Best practices**  
  - Chạy `node_exporter` bằng systemd/container, đảm bảo auto‑restart.  
  - Thêm label `env`, `role`, `region`, `instance` trong cấu hình scrape để dễ phân tích.  
  - Alert:
    - CPU > 90% trong 5 phút.  
    - Disk usage > 80%.  
    - Memory available < X.  
    - Node không còn report metrics (`up == 0`).

#### 2.2. Monitoring ứng dụng (HTTP API/microservices)
- **Triển khai client library**  
  - Dùng client chính thức: Go, Java, Python, Node.js, PHP,…  
  - Expose endpoint `/metrics` (hoặc tương tự).

- **Metric nên có**  
  - `http_requests_total` (counter) với label `method`, `status_code`, `path`, `service`.  
  - `http_request_duration_seconds` (histogram) với label `route`, `status_code`.  
  - Business metric (VD: `orders_created_total`, `payment_failed_total`).

- **Best practices**  
  - Không dán label có cardinality cao (userId, requestId) vào metric.  
  - Chuẩn hóa tên metric theo kiểu:  
    - `*_total` cho counter.  
    - `*_seconds` cho thời gian.  
    - `*_bytes` cho dung lượng.  
  - Tách metric **business** và **technical** (HTTP, DB, cache) rõ ràng.

#### 2.3. Monitoring Kubernetes
- **Thành phần**  
  - Prometheus (thường dùng Prometheus Operator hoặc kube-prometheus stack).  
  - `kube-state-metrics`, `node_exporter`, `cAdvisor`.  
  - Alertmanager, Grafana.

- **Best practices**  
  - Dùng **service discovery** (`kubernetes_sd_config`) thay vì liệt kê IP.  
  - Sử dụng `ServiceMonitor`/`PodMonitor` (nếu dùng Operator).  
  - Gắn label `cluster`, `namespace`, `app`, `component`.  
  - Có sẵn các alert chuẩn: node down, pod crash, etcd issues, API server latency, scheduler/ controller-manager down.

#### 2.4. Monitoring database & cache
- **Best practices**  
  - Triển khai exporter chính thức/uy tín (postgres_exporter, mysqld_exporter, redis_exporter, elasticsearch_exporter,…).  
  - Select subset metrics quan trọng:
    - Connection count, active queries.  
    - Latency, slow queries.  
    - Replication lag, failover.  
    - Cache hit ratio (Redis/Memcached).  
  - Alert theo:  
    - Connection approaching max.  
    - Replication lỗi / lag lớn.  
    - Tỷ lệ cache miss tăng bất thường.

---

### 3. Senior – Chi tiết implement: config & PromQL patterns

#### 3.1. Gợi ý cấu trúc config `prometheus/`
- `prometheus.yml` – include các file rule & scrape config con.  
- `scrape/infra.yml` – job cho infra (node, network, LB, v.v.).  
- `scrape/apps.yml` – job cho microservices.  
- `scrape/db.yml` – job cho database/cache.  
- `rules/recording/*.yml` – recording rules.  
- `rules/alerts/*.yml` – alert cho infra, app, db, business.

#### 3.2. Pattern PromQL hay dùng
- **Error rate**  
  - đo tỉ lệ request HTTP 5xx / tổng request.  
- **Latency P95/P99 với histogram**  
  - dùng `histogram_quantile` trên `*_bucket`.  
- **Resource saturation**  
  - CPU, memory, disk, file descriptor, goroutine/thread count,…  

Các mẫu PromQL chi tiết có thể tái sử dụng giữa nhiều service bằng cách chuẩn hóa label & metric name.

#### 3.3. Tích hợp Alertmanager
- **Triết lý**: Prometheus quyết định **khi nào** alert fire, Alertmanager quyết định **gửi đi đâu & như thế nào**.  
- **Best practices**:
  - Group alert theo `cluster`, `service`, `severity`.  
  - Sử dụng `inhibit_rules` để chỉ gửi 1 alert “root cause”, ẩn các alert phụ thuộc.  
  - Sử dụng `silence` khi bảo trì.

---

### 4. Principal – Hướng dẫn tái sử dụng & mở rộng trong tổ chức

#### 4.1. Chuẩn hóa & đóng gói
- Tạo **“metrics handbook” nội bộ**:  
  - Chuẩn metric name, label key, unit.  
  - Ví dụ chuẩn cho API, worker, DB, cache, queue, gateway.  
- Đóng gói:
  - **Helm chart / module** cho: Prometheus, Alertmanager, exporters, default rules & dashboards.  
  - Mỗi team chỉ cần override minimal values (service name, env).

#### 4.2. Multi‑cluster, multi‑region
- Mỗi cluster có Prometheus local để giảm phụ thuộc network.  
- Dùng:
  - **Federation** + recording rules → generate SLO metrics global.  
  - `remote_write` → Thanos/Cortex/Mimir/VictoriaMetrics để query toàn hệ thống & lưu dài.

#### 4.3. Quy trình làm việc gắn với Dev/SRE
- Khi build feature mới:
  - Bước 1: Xác định SLI/SLO liên quan.  
  - Bước 2: Thêm/instrument metrics & rule cần thiết.  
  - Bước 3: Thêm dashboard & alert tương ứng.  
  - Bước 4: Review metrics/alert trong PR như review code.  
  - Bước 5: Deploy cùng với feature (IaC/GitOps).

#### 4.4. Kết hợp với stack observability khác
- **Logs**: Loki/ELK/Better Stack,…  
- **Traces**: OpenTelemetry + Jaeger/Tempo,…  
- Thiết kế sao cho từ 1 alert Prometheus có thể **drill‑down** sang:
  - Log tương ứng.  
  - Trace tương ứng.  
  - Dashboard business liên quan.

---

### Tóm tắt theo cấp độ
- **Junior**: Biết chạy Prometheus + exporter, đọc metrics & cấu hình alert đơn giản.  
- **Middle**: Áp dụng best practices cho từng kênh (infra, app, K8s, DB).  
- **Senior**: Thiết kế cấu trúc config, PromQL patterns, Alertmanager routing, chuẩn hóa trong 1 hệ thống.  
- **Principal**: Xây dựng platform observability chuẩn hoá toàn tổ chức dựa trên Prometheus và các công cụ vệ tinh.


