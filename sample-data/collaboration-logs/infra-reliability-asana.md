# Project Log: Core Infrastructure Reliability — Asana Board

**Source:** Asana — Reliability initiative
**Team:** Core Infrastructure (Yaswanth Reddy, Lead DevOps Engineer)

## Task: Multi-region failover rollout
- **Status:** On Track
- **Owner:** Yaswanth Reddy (EMP_84920)
- **Contributors:** Tomas Novak (EMP_55713)
- **Summary:** Phase 2 enables automated failover for the US-West and US-East regions. Tested failover completes in under 90 seconds.

## Task: Schema registry provisioning
- **Status:** At Risk
- **Owner:** Tomas Novak (EMP_55713)
- **Summary:** Standing up a shared schema registry. The Payments team (PAY-1061) is waiting on this. ETA slipped one week due to IAM policy review with Security.
- **Collaborators:** Kevin Zhang (EMP_38475) reviewing the access policy.

## Task: Deploy pipeline hardening
- **Status:** Complete
- **Owner:** Yaswanth Reddy (EMP_84920)
- **Summary:** Zero-downtime deploys shipped across all core services. Deploy time down 60%.

## Cross-team note
Security (Kevin Zhang) and Infrastructure (Tomas Novak) are collaborating on the
IAM policy for the schema registry. This is the current critical-path dependency
for the Payments Platform roadmap.
