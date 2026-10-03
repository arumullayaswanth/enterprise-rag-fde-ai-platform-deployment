# Yash Academy — Enterprise RAG Platform

**Author:** Yaswanth

A Retrieval-Augmented Generation (RAG) platform over company knowledge, built on
AWS Bedrock and OpenSearch, with a React UI, a FastAPI backend, and modular
Terraform for deployment on ECS Fargate.

## What it does

A user asks a question → the question is embedded → OpenSearch finds the most
relevant document chunks → an LLM writes a grounded answer that cites its
sources. If nothing relevant is found, the UI shows a friendly "not found"
state instead of guessing.

```
Question → Embedding → Vector/Hybrid search → Top-K chunks → LLM → Cited answer
```

## Stack

| Layer | Technology |
|-------|------------|
| Embeddings | Amazon Bedrock — Titan Embed v2 (1024-dim) |
| Generation | Amazon Bedrock — Nova Lite (via Converse API, swappable) |
| Vector store | Amazon OpenSearch (kNN + keyword, hybrid RRF) |
| API | FastAPI (Python) |
| Frontend | React + Vite + TypeScript |
| Ingestion | AWS Lambda (S3-triggered) |
| Infra | Terraform modules → ECS Fargate, ALB, ECR, VPC, IAM |

## Project layout

```
app/
  api/          FastAPI service (/query, /ingest, /stats, /health) + Dockerfile
  ingestion/    loader, chunker, embeddings, indexer (also the Lambda handler)
  retrieval/    vector/hybrid search + RAG orchestration
frontend/       React UI (Ask chat, Overview, Directory, Org Chart,
                Leaderboard, Cost Centers, Knowledge Base)
sample-data/    synthetic company data (structured JSON + markdown docs)
terraform/      modular IaC (network, storage, security, search, ecr, alb,
                ecs, lambda)
docs/           architecture notes and diagrams
```

## Run locally

Two terminals: the backend API and the frontend dev server.

**1. Backend (port 8000)**
```bash
pip install -r requirements.txt
set REQUIRE_AUTH=false        # Windows cmd; use export on macOS/Linux
uvicorn app.api.main:app --reload --port 8000
```

**2. Frontend (port 5173)**
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api/*` to the backend.

- The **Overview / Directory / Org Chart / Leaderboard / Cost Centers** pages read
  the bundled sample data via `/stats` — no AWS needed.
- The **Ask** page needs the backend connected to Bedrock + OpenSearch with data
  ingested to answer live.

## Key API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness probe |
| GET | `/stats` | dashboard aggregates from the corpus |
| POST | `/ingest` | load + chunk + embed + index a source |
| POST | `/query` | retrieval-augmented answer with citations |

Auth: when `REQUIRE_AUTH=true`, `/query`, `/ingest`, and `/stats` require an
`x-api-key` header. Set the key in the UI via the "API key" button.

## Ingesting data

Supported file types: `.txt`, `.md`, `.pdf`, `.json`. JSON arrays are indexed as
one record per entry. Point `/ingest` (or the S3 upload trigger) at a local path
or `s3://bucket/uploads/`.

## Deploy

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

Build and push both images (API + ingest) to the ECR repos output by Terraform,
then the ECS service and Lambda run them.

## Notes

- All sample data is synthetic.
- The public ALB listener is plain HTTP; add a TLS certificate and narrow
  `allowed_web_cidrs` before using real data.


**Provider URL**: `https://token.actions.githubusercontent.com`
**Audience**: `sts.amazonaws.com`
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:GITHUB_ORG/REPO:*"
        }
      }
    }
  ]
}
```


| Name | Value |
|------|-------|
| `AWS_REGION` | your region, e.g. `us-east-1` |
| `AWS_OIDC_ROLE_ARN` | the role ARN from Step 2 |
| `TF_STATE_BUCKET` | the bucket name from Step 1 |
