# Monitoring Stack

This stack runs Prometheus, Alertmanager, Loki, Promtail, Blackbox Exporter, and Grafana.

## Configure

1. Update Alertmanager SMTP settings in `alertmanager/alertmanager.yml`.
2. Ensure `../.env` contains SMTP values used by Grafana:
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
3. Set a Grafana admin password:
   - `export GRAFANA_ADMIN_PASSWORD=your-strong-password`

## Start

```bash
cd /git_folder/udbhav/code/UI-3GPP/monitoring
sudo docker compose up -d
```

## Nginx

Make sure nginx proxies `monitor.wisdomlab3gpp.live` to `127.0.0.1:3000` and has a valid cert.

## Verify

```bash
curl -kI https://monitor.wisdomlab3gpp.live/
```

Grafana default user is `admin` with the password from `GRAFANA_ADMIN_PASSWORD`.

## Notes

- Blackbox probes `https://wisdomlab3gpp.live/` and `https://wisdomlab3gpp.live/api/health`.
- Promtail scrapes `/var/log/nginx/*.log`, `/var/log/syslog`, and Docker container logs.
