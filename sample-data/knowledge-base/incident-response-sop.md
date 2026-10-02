# SOP: Production Incident Response

**Owner:** Core Infrastructure
**Last reviewed:** 2026-08-15
**Source:** Internal Confluence — Engineering Handbook

## Severity Levels

| Severity | Definition | Response time |
|----------|------------|---------------|
| SEV1 | Full outage or data loss | 15 minutes |
| SEV2 | Major feature degraded | 30 minutes |
| SEV3 | Minor degradation, workaround exists | 4 hours |
| SEV4 | Cosmetic or low impact | Next business day |

## Procedure

1. **Detect** — Alert fires or a report arrives. The on-call engineer acknowledges within the response window.
2. **Declare** — For SEV1/SEV2, open an incident channel and assign an Incident Commander.
3. **Mitigate** — Restore service first; root cause can wait. Roll back or fail over as needed.
4. **Communicate** — Post status updates every 30 minutes to stakeholders.
5. **Resolve** — Confirm service health and close the incident.
6. **Review** — Run a blameless postmortem within 5 business days for SEV1/SEV2.

## Roles

- **Incident Commander:** owns coordination and decisions.
- **Communications Lead:** owns stakeholder updates.
- **Subject Matter Experts:** diagnose and fix.
