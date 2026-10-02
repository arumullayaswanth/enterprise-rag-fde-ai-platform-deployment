```bash
sample-data/
├── structured/                        (categories 1–6, JSON)
│   ├── employee-directory.json        20 employees: IDs, names, emails,
│   │                                  manager_id hierarchy, level/level_rank
│   │                                  (L3–L11), status (Active/On Leave),
│   │                                  type (Full-Time/Contractor)
│   ├── performance-metrics.json       top-10 leaderboard: revenue, quota %,
│   │                                  tickets resolved, appraisal scores (floats)
│   └── cost-centers.json              budgets, YTD spend, headcount, parent CC
├── job-descriptions/                  (category 7, Markdown)
│   ├── senior-staff-engineer.md
│   ├── product-manager.md
│   └── security-engineer.md
├── resumes/                           (category 8, Markdown)
│   ├── yaswanth-reddy-profile.md      skill matrices: Terraform, Kubernetes, AWS…
│   ├── lucas-fernandez-profile.md
│   └── daniel-okafor-profile.md
├── knowledge-base/                    (category 9, Markdown — Confluence/Notion)
│   ├── incident-response-sop.md
│   ├── pto-and-leave-policy.md
│   └── data-access-governance.md
├── collaboration-logs/                (category 10, Markdown — Jira/Asana)
│   ├── payments-platform-jira.md
│   └── infra-reliability-asana.md
└── announcements/
    └── q3-2026-org-update.txt         (plain-text format)
```

```bash

**Root (`terraform/`):**
- `main.tf` — module wiring + shared locals (new)
- `provider.tf` — terraform/provider/backend config
- `variables.tf` — all input variables (unchanged)
- `outputs.tf` — now reads from module outputs

**Modules (`terraform/modules/`):**
| Module | Owns |
|--------|------|
| `network` | VPC, subnets, NAT, routes, S3 endpoint, **API security group** |
| `storage` | S3 documents bucket + encryption/versioning/TLS policy + ingest notification |
| `security` | IAM roles (ECS task/exec, Lambda), runtime policy, API-key secret |
| `search` | OpenSearch domain + its security group |
| `ecr` | the two container registries + lifecycle policy |
| `alb` | load balancer, target group, listener, ALB security group |
| `ecs` | Fargate cluster, task def, service, autoscaling |
| `lambda` | ingest function, SG, DLQ, S3 invoke permission |

```