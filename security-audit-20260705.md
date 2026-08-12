# hummingbirdai.net Security Audit Report

**Date:** 2026-07-05
**Source:** Analysis of real-world DDoS attack on AIHOT (Chinese indie web app, 48-hour sustained attack, 13M+ requests)
**Status:** Pre-DNS-cutover, Phase 1 infra ready, mk-assurance APPROVED
**Target:** hummingbirdai.net (college-advisor-agent on VPS 47.90.167.243)

---

## 1. Source article summary

A Chinese indie developer's web app (AIHOT) was attacked for 48 hours by a solo attacker branded `#TeamAntiAI`. The attack exposed critical security gaps in a vibe-coded shared server setup. Key facts:

- **13M+ malicious requests** over 48 hours
- **Peak: 870K requests/minute** (340x normal traffic)
- **Nginx connection pool exhaustion** (768 max) via unprotected sibling project
- **Feedback form spam** (30K+ junk records, rate limit bypass)
- **Multi-IP coordinated attack** with cache-busting random query params
- **Response time degradation** from 40ms to 60,000ms (1,500x slower)
- Attacker exploited **unprotected sibling projects** on same server, not the target app itself

> "The attacker didn't break the protected service. They found the unprotected sibling on the same server and used that to exhaust shared resources."

---

## 2. Attack phases (from real case)

### Phase 1 — Reconnaissance
- German IP crawled the site, built a list of real image URLs
- Tested each URL to confirm server responds
- User-Agent: `#TeamAntiAI` (intentional signature/taunt)

### Phase 2 — Brute-force DDoS on image API
- 2.36M requests in 4 minutes to image endpoint
- Peak: 870K/min
- Rate limiter caught 99.95% — only 1,200 requests got through
- **App-level rate limiting worked.** This was NOT the failure point.

### Phase 3 — Exploiting unprotected sibling (the real kill)
- Attacker scanned all 30+ projects on shared server
- Found unprotected project domain (no rate limiting)
- 8.68M requests sent to unprotected domain
- Nginx connection pool (768) filled completely
- **All projects on server went down** — including the rate-limited target
- Real users saw connection timeouts and 5xx errors

### Phase 4 — Feedback form abuse
- Slow-burn spam at 5.5 req/sec (just below rate limit threshold)
- 30K+ garbage records injected into database
- Feishu alert channel overwhelmed with notifications
- Attacker used fake QQ email addresses as form input

### Phase 5 — Multi-IP coordinated attack
- New IPs: cloud servers + residential broadband
- Each IP stayed under individual rate limits
- Combined traffic exhausted server rendering capacity
- Random query parameters defeated page cache
- Dynamic/uncached pages targeted (expensive to render)
- Response time: 40ms → 60,000ms

---

## 3. Our current security posture

### Already implemented (Phase 1)

| Item | Status | Details |
|---|---|---|
| App localhost bind | ✅ Done | `127.0.0.1:3001` — not publicly exposed |
| Caddy reverse proxy | ✅ Done | All traffic through Caddy, no direct app access |
| Security headers | ✅ Done | HSTS, X-Content-Type-Options, Referrer-Policy, X-Robots-Tag |
| robots.txt | ✅ Done | `User-agent: * Disallow: /` |
| Caddy admin API | ✅ Done | Disabled |
| TLS termination | ⏳ Pending | Requires DNS cutover first (Let's Encrypt ACME) |

### Missing (requires implementation)

| Item | Risk level | Status |
|---|---|---|
| Server-level rate limiting | **CRITICAL** | ❌ Not implemented |
| Connection pool limits | **CRITICAL** | ❌ Not configured |
| CAPTCHA on auth/form endpoints | **HIGH** | ❌ Not implemented |
| Automated IP banning (CrowdSec) | **HIGH** | ❌ Not installed |
| Cache key hardening | **HIGH** | ❌ Not configured |
| Per-endpoint rate limits | **HIGH** | ❌ Not configured |
| Log retention policy | **MEDIUM** | ❌ Not configured |
| Alerting / monitoring | **MEDIUM** | ❌ Not configured |
| Geo-blocking | **LOW** | ❌ Not configured (private beta) |
| Request fingerprinting | **LOW** | ❌ Not configured |

---

## 4. Weakness-by-weakness diagnosis

### W1: No server-level global rate limiting

**What happened in AIHOT:** App-level rate limiter worked for the target app, but sibling projects had no limits. Attacker found the unprotected path.

**Our exposure:** Caddy has no rate limiting by default. If app-level limits exist, they only protect specific endpoints. Server-level exhaustion is possible.

**Required fix:**
- Install Caddy rate limit plugin OR use iptables `hashlimit` rules
- Set per-IP request rate cap at reverse proxy layer (e.g. 30 req/sec)
- Global ceiling: max total requests per second across all clients

**Feasibility:** ✅ High — `caddy-ratelimit` module or `iptables hashlimit`

---

### W2: Connection pool exhaustion

**What happened in AIHOT:** Nginx had 768 concurrent connection limit. Attacker filled all slots. No new connections possible for any user.

**Our exposure:** Caddy has default limits. Without tuning, same attack vector applies.

**Required fix:**
- Tune Caddy `MaxConnsPerHost` and global `server_max_conns`
- Set per-IP connection limits (e.g. max 10 concurrent per IP)
- Add connection timeout settings to prevent slow-loris style holds

**Feasibility:** ✅ High — Caddy global options config

---

### W3: No CAPTCHA / bot protection on form endpoints

**What happened in AIHOT:** Feedback form spammed with 30K+ junk records at 5.5 req/sec. No CAPTCHA to distinguish human from bot.

**Our exposure:** College portal has login, registration, feedback, password reset. All attackable without CAPTCHA.

**Required fix:**
- Cloudflare Turnstile (free, invisible for real users) on all auth/form endpoints
- Server-side: validate Turnstile token before processing form submission
- Applicable endpoints: `/login`, `/register`, `/feedback`, `/reset-password`

**Feasibility:** ✅ High — Turnstile is JS widget, no cost, minimal integration

---

### W4: Rate limit bypass via threshold-staying

**What happened in AIHOT:** Attacker sent traffic at 5.5 req/sec — just under the fixed-window rate limit. Never triggered block.

**Our exposure:** If we implement simple fixed-window rate limiting, same bypass works.

**Required fix:**
- Sliding window rate limiter (not fixed window)
- Burst detection: if sustained traffic > N% of normal baseline for > M minutes, auto-escalate
- Separate limits per endpoint category (auth: strict, static: relaxed)

**Feasibility:** ✅ Medium — needs sliding window implementation in Caddy or middleware

---

### W5: Cache bypass via random query parameters

**What happened in AIHOT:** Attacker added random params (`?v=rand123`) to URLs. Cache treated each as unique page. Server re-rendered every request.

**Our exposure:** If college portal has any cached pages, same attack defeats the cache.

**Required fix:**
- Strip unknown query parameters before cache key generation
- Whitelist known params: `token`, `page`, `sort`
- All other params ignored for cache key purposes
- Extend cache TTL for read-heavy pages (3-5 minutes for informational pages)

**Feasibility:** ✅ High — Caddy `rewrite` + cache configuration

---

### W6: Expensive page targeting

**What happened in AIHOT:** Attacker identified dynamic/uncached pages that require server-side rendering. Hit those specifically. 40ms → 60s response time.

**Our exposure:** College portal has SSR/dynamic pages. Any expensive endpoint is a target.

**Required fix:**
- Profile all endpoints for response time
- Identify top 5 slowest endpoints
- Add aggressive caching for read-heavy pages
- Add stricter per-endpoint rate limits for expensive routes
- Consider response time monitoring with auto-block for slow endpoints

**Feasibility:** ✅ Medium — needs endpoint profiling first

---

### W7: No automated IP banning

**What happened in AIHOT:** Every IP had to be manually reviewed and banned. Attacker outpaced human response time.

**Our exposure:** Currently no auto-ban mechanism exists. Manual intervention required for every attack IP.

**Required fix:**
- **CrowdSec** (open-source, free) — real-time behavioral detection + auto-ban
- `crowdsec-caddy-bouncer` for native Caddy integration
- Community threat intel: CrowdSec shares malicious IP reputation across users
- Custom scenarios for: request flood, form spam, scanner detection

**Feasibility:** ✅ High — CrowdSec is free, well-documented, Caddy-native bouncer available

---

### W8: Multi-IP coordinated low-and-slow attack

**What happened in AIHOT:** Multiple IPs (cloud + residential) each staying under individual rate limits. Combined traffic exhausted server. Traditional per-IP blocking ineffective.

**Our exposure:** Any per-IP rate limiting system is vulnerable to distributed low-and-slow attacks.

**Required fix:**
- CrowdSec correlated detection (identifies coordinated patterns)
- Session-based rate limiting (not just IP-based)
- Global request budget: max total requests per second across all clients
- Geo-blocking for regions outside target user base (private beta = narrow geo)

**Feasibility:** ✅ Medium — CrowdSec handles correlated detection; session-based needs app support

---

### W9: Short log retention

**What happened in AIHOT:** Forensics difficult without historical logs. Author extended to 1 year retention after attack.

**Our exposure:** Caddy JSON logs configured but no retention policy set.

**Required fix:**
- Configure log rotation with compression
- Retain access logs ≥90 days minimum
- Separate error logs from access logs
- Consider: ship logs to external storage for durability

**Feasibility:** ✅ High — Caddy JSON logging + logrotate

---

### W10: Alert fatigue / technical alert messages

**What happened in AIHOT:** Alert messages written in engineering jargon. Non-technical operator couldn't parse them. Delayed response.

**Our exposure:** If we add monitoring, alerts need to be human-readable.

**Required fix:**
- All alerts in plain language (what happened → what it means → what to do)
- Telegram webhook for threshold breaches
- Alert thresholds: error rate spike, p99 >2s, connection count >500

**Feasibility:** ✅ Medium — needs webhook integration

---

### W11: Crawlers / mirror sites

**What happened in AIHOT:** Hidden scrapers continuously scraped content for mirror sites. Discovered during attack forensics.

**Our exposure:** `robots.txt` blocks crawlers, `X-Robots-Tag` set. But aggressive scrapers ignore robots.txt.

**Required fix:**
- Rate limit aggressive scrapers (CrowdSec fingerprint detection)
- Monitor for duplicate content appearing on mirror sites
- Consider: require authentication for all content (private beta advantage)

**Feasibility:** ✅ High — CrowdSec + existing headers. Private beta already limits exposure.

---

### W12: Shared server resource contention

**What happened in AIHOT:** 30+ projects on one server. Unprotected project exhausted shared nginx pool. All projects went down.

**Our exposure:** Currently college-advisor is likely the main service. But any future service added to VPS without same security baseline = attack vector.

**Required fix:**
- Document security baseline as mandatory for any new service on this VPS
- Services must either: have own rate limiting, OR inherit Caddy-level protection
- Connection limits per site block in Caddy (isolation)

**Feasibility:** ✅ High — process/documentation + Caddy site-block config

---

## 5. Implementation plan

### P0 — Before DNS cutover

| # | Action | Owner | Effort |
|---|---|---|---|
| 1 | Caddy rate limiting (per-IP + global) | `tg-bot-c` | 2h |
| 2 | Connection pool tuning (Caddy max conns) | `tg-bot-c` | 1h |
| 3 | Turnstile CAPTCHA on login/register/feedback | `tg-bot-b` | 3h |
| 4 | Log retention policy (≥90 days, rotation) | `tg-bot-c` | 1h |

### P1 — Within 48h of DNS cutover

| # | Action | Owner | Effort |
|---|---|---|---|
| 5 | CrowdSec install + Caddy bouncer | `tg-bot-c` | 2h |
| 6 | Cache key hardening (strip random params) | `tg-bot-c` | 1h |
| 7 | Per-endpoint rate limits (strict for auth/forms) | `tg-bot-b` + `tg-bot-c` | 2h |

### P2 — First week

| # | Action | Owner | Effort |
|---|---|---|---|
| 8 | Telegram alerting on anomalies | `tg-bot-c` | 2h |
| 9 | Geo-blocking (if applicable for beta) | `tg-bot-c` | 30m |
| 10 | Endpoint response time profiling | `tg-bot-b` | 2h |

---

## 6. Key lessons from AIHOT case

1. **The protected service was never breached.** The attacker exhausted shared resources via an unprotected sibling. **Lesson:** security is only as strong as the weakest co-located service.

2. **App-level rate limiting is necessary but not sufficient.** Server-level (reverse proxy) limits must exist to prevent connection pool exhaustion. **Lesson:** defense in depth — rate limit at Caddy AND at app layer.

3. **Fixed-window rate limits are trivially bypassable.** Attacker sent at `threshold - 1` indefinitely. **Lesson:** use sliding window + burst detection.

4. **Random query parameters defeat naive caching.** Attacker generated unique params to force server re-rendering. **Lesson:** normalize/strip unknown params before cache key.

5. **Multi-IP coordination defeats per-IP limits.** Each IP under threshold, but combined traffic overwhelms. **Lesson:** need global request budget + correlated detection (CrowdSec).

6. **Non-technical operators need plain-language alerts.** Delayed response because operator couldn't understand engineering jargon. **Lesson:** write alerts for the person reading them at 3am.

7. **Manual IP banning is too slow against determined attackers.** Attacker outpaced human review. **Lesson:** automate with CrowdSec behavioral detection.

8. **Log retention matters for forensics.** Without historical logs, attack analysis is impossible. **Lesson:** retain ≥90 days, compress older logs.

---

## 7. Conclusion

hummingbirdai.net is entering production with a solid foundation:

- ✅ App not publicly exposed (localhost bind)
- ✅ Reverse proxy with security headers
- ✅ TLS ready (pending DNS cutover)
- ✅ Admin API disabled

But we lack the **operational security layer** that the AIHOT case proved critical:

- ❌ No rate limiting at server level
- ❌ No connection pool limits
- ❌ No CAPTCHA on form endpoints
- ❌ No automated threat detection (CrowdSec)
- ❌ No monitoring/alerting

**Priority: implement P0 items before DNS cutover.** The AIHOT attack started within hours of the site being discoverable. Our private beta reduces exposure but does not eliminate it.

---

*Report generated: 2026-07-05 by mk-control*
*Source article: https://mp.weixin.qq.com/s/mvVVvlIF_rZISGXtsI7Igw*
*Target: hummingbirdai.net (college-advisor-agent)*
