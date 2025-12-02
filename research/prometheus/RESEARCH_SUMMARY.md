## RESEARCH_SUMMARY – Tóm tắt nghiên cứu về Prometheus

> Ngày truy cập tài liệu: 01/12/2025  
> Chủ đề: Prometheus là gì, dùng khi nào, giải quyết vấn đề gì; kiến trúc, workflow, use case & best practices.

---

### 1. Nguồn thông tin chính đã sử dụng

- **Tài liệu chính thức Prometheus**
  - Trang chủ:  
    - Tiêu đề: *Prometheus – Monitoring system & time series database*  
    - URL: `https://prometheus.io/`  
    - Nội dung chính: giới thiệu Prometheus là hệ thống monitoring & time series database, data model đa chiều, PromQL, alerting, exporters, client libs, tích hợp cloud‑native & Kubernetes, open governance CNCF.

  - Tài liệu kiến trúc & khái niệm (thông qua Wikipedia và docs):  
    - Tiêu đề: *Overview* / *Concepts* / *Data model* / *Metric types*  
    - Bổ trợ bởi:  
      - Wikipedia – *Prometheus (software)*  
      - URL: `https://en.wikipedia.org/wiki/Prometheus_(software)`  
      - Nội dung chính: lịch sử phát triển, kiến trúc tổng quan, data model đa chiều, pull model, PromQL, Alertmanager, exporters, mối quan hệ với OpenMetrics, vai trò trong CNCF.

- **Bài viết hướng dẫn & phân tích chi tiết**
  - Dash0 – *Prometheus Monitoring: From Zero to Hero, The Right Way*  
    - URL: `https://www.dash0.com/guides/prometheus-monitoring`  
    - Nội dung chính: giải thích Prometheus như time‑series DB + query engine, pull model, targets & `/metrics`, exporters, service discovery, Alertmanager, PromQL & metric types, setup stack với Docker Compose, remote_write, scaling với Thanos/Mimir/VictoriaMetrics, use case thực tế & best practices.

  - Better Stack – *What is Prometheus Monitoring? A Beginner's Guide*  
    - URL: `https://betterstack.com/community/guides/monitoring/prometheus/`  
    - Nội dung chính: khái niệm Prometheus, cách hoạt động (scrape `/metrics`), metric types, cách bắt đầu với Docker Compose, khi nào Prometheus phù hợp / hạn chế (long‑term retention, precision cho finance/billing), link đến best practices & các bài hướng dẫn khác (Alertmanager, PromQL,…).

  - Plural – *Kubernetes Monitoring with Prometheus: A Complete Guide*  
    - URL: `https://www.plural.sh/blog/prometheus-kubernetes-monitoring-guide/`  
    - Nội dung chính: vai trò của Prometheus trong Kubernetes, service discovery, Prometheus Operator, exporters (node_exporter, kube-state-metrics, cAdvisor), PromQL use case cho node/pod/container, alerting với Alertmanager, scaling bằng federation & remote_write, GitOps & multi‑cluster.

---

### 2. Phát hiện chính

- **Prometheus là gì?**
  - Hệ thống **monitoring & alerting mã nguồn mở**, đồng thời là **time series database** cho metrics.  
  - Dùng **HTTP pull model**: Prometheus chủ động scrape metrics từ target (thường là `/metrics`).  
  - Hỗ trợ **data model đa chiều** (metric + labels), **PromQL**, **Alertmanager**, **exporters**, **client libraries**.

- **Prometheus giải quyết vấn đề gì?**
  - Giải quyết bài toán thiếu một hệ thống **metrics tập trung, đa chiều, dễ query** cho hạ tầng & ứng dụng hiện đại (microservices, container, Kubernetes).  
  - Thay thế/khắc phục hạn chế của các stack như **StatsD + Graphite** trong môi trường dynamic.  
  - Cho phép **quan sát hệ thống theo thời gian (observability via metrics)**, phát hiện & phản ứng với sự cố thông qua alerting.

- **Khi nào nên dùng Prometheus?**
  - Giám sát **hạ tầng** (server, VM, container), **ứng dụng** (HTTP, worker), **Kubernetes**, **database/cache**, **business metrics**.  
  - Cần **metrics‑based SLO/SLA**, golden signals, error rate, latency, saturation.  
  - Muốn tự chủ hệ thống monitoring on‑prem/multi‑cloud, dựa trên công nghệ chuẩn CNCF.

- **Khi nào Prometheus không phù hợp / cần bổ sung thêm công cụ khác?**
  - Trường hợp yêu cầu **precision cực cao** (billing/finance, audit chi tiết) → cần DB chuyên biệt.  
  - **Long‑term retention ở scale rất lớn** → nên dùng remote storage (Thanos, Cortex/Mimir, VictoriaMetrics,…).  
  - Khi cần **logs & traces**, Prometheus chỉ là 1 trụ (metrics) trong observability triad → cần bổ sung stack log/tracing.

---

### 3. Kiến trúc đề xuất (tóm lược)

- **Lớp thu thập**: Prometheus server scrape:  
  - Ứng dụng đã instrument client library.  
  - Exporters (node_exporter, postgres_exporter, redis_exporter, kube-state-metrics, cAdvisor, …).  
  - Kubernetes components qua service discovery.

- **Lớp lưu trữ**: TSDB nội bộ, block + WAL, retention theo time/size.  
- **Lớp query & rule**: PromQL, recording rules, alerting rules.  
- **Lớp alerting**: Alertmanager (grouping, dedupe, route, silence, inhibition).  
- **Lớp visualization**: Grafana (hoặc dashboard khác) + API cho tool bên ngoài.

- **Ở quy mô lớn**:
  - Mỗi cluster/region có Prometheus local.  
  - Dùng **federation** cho view global, **remote_write** cho lưu trữ dài hạn & global query.  
  - Toàn bộ config được quản lý bằng **GitOps**.

---

### 4. Các use case đã xác định

1. **Monitoring hạ tầng server/VM** với node_exporter: CPU, RAM, Disk, Network, hệ điều hành.  
2. **Monitoring microservices / API**: request count, error rate, latency, QoS theo route/status/env.  
3. **Monitoring Kubernetes cluster**: node health, pod status, deployment/cronjob state, control plane metrics.  
4. **Monitoring database & cache**: connection, latency, replication, cache hit/miss, health toàn hệ thống lưu trữ.  
5. **Monitoring business metrics & SLO**: orders, signup, payment, funnel, error rate theo feature, theo vùng/tenant.

---

### 5. Liên kết sang các tài liệu trong bộ research

- `README.md` – Tổng quan Prometheus theo 4 cấp độ (junior/middle/senior/principal).  
- `ARCHITECTURE.md` – Kiến trúc lớp, luồng dữ liệu, use case và mô hình mở rộng (federation, remote storage).  
- `WORKFLOW_PATTERNS.md` – Các workflow/pattern phổ biến (golden signals, infra, K8s, DB, recording rules, multi‑tenant, federation).  
- `Implement_Guide.md` – Hướng dẫn implement thực tế, best practices cho từng “kênh” (infra, app, K8s, DB) và cách chuẩn hóa cho toàn tổ chức.


