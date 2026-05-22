# quelora-jobs

**Scheduled job runner for the [Quelora](https://github.com/Quelora) platform.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)

A BullMQ worker dedicated to recurring, scheduled (cron-style) jobs — the
periodic maintenance tasks that keep tenant data fresh.

## Jobs

| Job | Purpose |
|-----|---------|
| `reputation` | Process queued reputation events into trust scores |
| `suggestion` | Generate profile / follow suggestions |
| `gravity-decay` | Time-decay of content ranking scores |
| `system` | System-level maintenance tasks |
| `enterprise` | Enterprise job routing (gamification, ad stats) |

Job schedules and parameters are configured per client and managed from the
dashboard.

## Requirements

- Node.js 20+ · MongoDB 4.4+ · Redis 6+ (BullMQ broker)

## Setup

```bash
npm install
# configure the environment (CACHE_REDIS_URL, MONGO_URI, …)
npm start
```

## Architecture

Depends on [`@quelora/common`](https://github.com/Quelora/quelora-common).
Companion to [`quelora-worker`](https://github.com/Quelora/quelora-worker),
which handles real-time (non-scheduled) background work.

## License

[AGPL-3.0-only](./LICENSE) — Copyright (C) 2026 Germán Zelaya.

Part of the **[Quelora](https://github.com/Quelora)** project.
