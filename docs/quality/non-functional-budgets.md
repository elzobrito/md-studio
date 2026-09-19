# Non-functional budgets

| Metric | Budget |
|--------|--------|
| Preview refresh (250 KiB doc) | ≤ 250 ms on reference laptop |
| UI thread during 1 MiB parse | Non-blocking (Web Worker) |
| Cold start to shell | Best effort < 3 s |
| Search cancel | Cooperative cancel within 100 ms of request |
| Memory baseline idle | Documented in release notes |
