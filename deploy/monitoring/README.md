# AREENA Central Monitoring & Logging Stack

This directory contains the production Docker Compose setup for your central **Monitoring & Log Aggregation VPS**.

It runs:
- **Caddy**: Reverse proxy with automatic Let's Encrypt SSL certificates and HTTP Basic Auth.
- **Grafana**: Web UI for searching logs and viewing system/access dashboards (`logs.areena.ch`).
- **Loki**: Low-memory log storage and LogQL indexer.
- **Uptime Kuma**: Status page and HTTP/ping uptime monitors (`status.areena.ch`).

Total RAM Footprint: **~300 MB** (fits easily on a cheap 1 vCPU / 1GB or 2GB VPS).

---

## 1. Quick Start on the Central VPS

1. Clone or copy the `deploy/monitoring` directory to `/opt/areena-monitoring` on your monitoring VPS:
   ```bash
   mkdir -p /opt/areena-monitoring
   cd /opt/areena-monitoring
   ```

2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. Generate a secure password hash for the remote log shippers (Vector):
   ```bash
   docker run --rm caddy:2-alpine caddy hash-password --plaintext "YourSecretShipperPassword2026"
   ```
   Paste the generated `$2a$14$...` hash into `.env` under `SHIPPER_PASSWORD_HASH`.

4. Start the stack:
   ```bash
   docker compose up -d
   ```

---

## 2. GitHub Actions Variables & Secrets Configuration

On your application repository (**Settings > Secrets and variables > Actions**), configure:

### Variables (Repository Variables):
| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `LOGGING_URL` | `https://logs.areena.ch` | Base URL of central logging VPS (Vector appends `/loki/api/v1/push`) |
| `LOGGING_USER` | `shipper` | Basic auth username (defaults to `shipper`) |

### Secrets (Repository Secrets):
| Secret Name | Example Value | Description |
| :--- | :--- | :--- |
| `LOGGING_PASSWORD` | `YourSecretShipperPassword2026` | Plaintext password matching `SHIPPER_PASSWORD_HASH` |

---

## 3. Connecting Loki in Grafana

1. Open `https://logs.areena.ch` in your browser.
2. Sign in with the credentials set in `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD`.
3. Go to **Connections > Data Sources > Add data source > Loki**.
4. Set the URL to:
   ```text
   http://loki:3100
   ```
5. Click **Save & Test**.

Now you can use the **Explore** tab in Grafana to search logs across all your servers in real time:
- `{host="areena-demo"}`
- `{service="backend"} |= "ERROR"`
- `{service="caddy"}`
