# Deployment

Everything runs **manually** from the GitHub **Actions** tab. Nothing deploys on push.

Do Steps 1–3 once. Then use Step 4 to apply or destroy anytime.

---

## Step 1 — Create the Terraform state bucket (S3 Console)

1. Open **S3 → Create bucket**.
2. **Bucket name**: a globally-unique name, e.g. `my-rag-tfstate-<your-account-id>`.
3. **Region**: the region you will deploy to (e.g. `us-east-1`).
4. **Bucket Versioning**: **Enable**.
5. Leave the rest default → **Create bucket**.

Remember this bucket name — it goes in Step 3.

---

## Step 2 — Create the OIDC provider + IAM role (IAM Console)

### 2a. Add GitHub as an identity provider

1. Open **IAM → Identity providers → Add provider**.
2. **Provider type**: **OpenID Connect**.
3. **Provider URL**: `https://token.actions.githubusercontent.com` → **Get thumbprint**.
4. **Audience**: `sts.amazonaws.com`.
5. **Add provider**.

(If it already exists, skip to 2b.)

### 2b. Create the role GitHub Actions will assume

1. Open **IAM → Roles → Create role**.
2. **Trusted entity type**: **Web identity**.
3. **Identity provider**: `token.actions.githubusercontent.com`.
4. **Audience**: `sts.amazonaws.com`.
5. **GitHub organization**: your username/org. **Repository**: this repo. (Branch blank.)
6. **Next** → attach **AdministratorAccess** → **Role name**: `github-rag-deploy` → **Create role**.
7. Open the role and **copy its ARN** (`arn:aws:iam::<account-id>:role/github-rag-deploy`).

### 2c. Trust policy (verify after creating)

Open the role → **Trust relationships → Edit trust policy**. Replace `ACCOUNT_ID`,
`GITHUB_ORG`, `REPO`. The `sub` line locks the role to **your** repo.

```json
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

---

## Step 3 — Set GitHub variables

In the repo: **Settings → Secrets and variables → Actions → Variables** tab →
**New repository variable** (none of these are secret):

| Name | Value |
|------|-------|
| `AWS_REGION` | your region, e.g. `us-east-1` |
| `AWS_OIDC_ROLE_ARN` | the role ARN from Step 2 |
| `TF_STATE_BUCKET` | the bucket name from Step 1 |

---

## Step 4 — Apply or Destroy (manual)

Workflow: **`fde-rag-deployment`**. It never runs on push — only when you trigger it.

1. Repo → **Actions** → **fde-rag-deployment** → **Run workflow**.
2. In the **action** dropdown choose:
   - **apply** — builds both images, provisions everything, uploads sample data, builds the search index. The **Web URL** is printed in the run summary.
   - **destroy** — force-empties the documents bucket and tears all infrastructure down.
3. **Run workflow**.

> First **apply** creates an OpenSearch domain and can take 15–25 minutes.

---

## Architecture page (optional, separate)

Workflow: **`deploy-architecture-page`** — also manual only.

- It syncs the repo-root `index.html` from `architecture-animated.html` and publishes
  it to GitHub Pages at
  `https://<your-username>.github.io/<repo-name>/`.
- Run it from **Actions → deploy-architecture-page → Run workflow** after editing the
  architecture page.

---

## Notes

- The documents bucket is auto-named `fde-rag-prod-documents-<account-id>`, unique per account — no edits needed.
- The load balancer is plain HTTP and open to everyone by default. For real use, set `allowed_web_cidrs` to your IP and add HTTPS.
- Destroy is safe to re-run; it force-empties the versioned bucket before deleting.
