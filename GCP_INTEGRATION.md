# 🚀 GCP Integration Guide - MOVA LSP

**Status:** 📋 Planning Phase  
**Date:** October 16, 2025  
**Author:** Sergii Miasoiedov

---

## 📋 Overview

This guide details the integration of MOVA LSP with Google Cloud Platform (GCP) services for production deployment, as specified in the technical requirements.

**Goal:** Deploy MOVA LSP as production-ready cloud services with enterprise-grade observability, security, and scalability.

---

## 🏗️ Architecture

```
┌─ Local Development
│  ├─ VS Code Extension (LSP Client)
│  └─ MOVA LSP Server (Local)
│
├─ npm Registry
│  ├─ leryk-schemas-mova
│  ├─ leryk-sdk-mova
│  ├─ leryk-lsp-mova
│  ├─ leryk-cli-mova
│  └─ leryk-vscode-mova
│
└─ GCP Production
   ├─ Cloud Run
   │  ├─ LSP Server (long-lived connections)
   │  └─ Executor Service
   │
   ├─ Cloud Functions
   │  ├─ validate/ (validation endpoint)
   │  ├─ schema:fetch (schema download)
   │  └─ snippet:generate (snippet generation)
   │
   ├─ Cloud Storage
   │  └─ mova-schemas/ (schema mirror)
   │
   ├─ Pub/Sub
   │  ├─ validation-events
   │  └─ workflow-events
   │
   ├─ Cloud Workflows
   │  ├─ validate → enrich → store → publish
   │  └─ schema-sync workflows
   │
   ├─ Cloud Tasks
   │  └─ Retry queue + idempotency
   │
   ├─ Secret Manager
   │  ├─ npm-token
   │  ├─ executor-tokens
   │  └─ webhook-hmac-secrets
   │
   ├─ Artifact Registry
   │  └─ Docker images (server-lsp, functions)
   │
   ├─ Cloud Logging & Monitoring
   │  └─ Structured logs, metrics, traces
   │
   └─ IAM Service Accounts
      └─ Least privilege roles
```

---

## 📦 GCP Services Required

### 1. **Cloud Run** (LSP Server & Executor)
- **Purpose:** Long-lived HTTP/WebSocket server
- **Config:**
  - CPU: 2-4 vCPU
  - Memory: 2-4 GB
  - Timeout: 3600s
  - Concurrency: 100
  - Autoscale: 0-100 instances
- **Deployment:** Docker image from Artifact Registry

### 2. **Cloud Functions** (Stateless Operations)
- **Purpose:** Fast, scalable validation & schema operations
- **Functions:**
  - `validate` - POST /validate (body: envelope JSON)
  - `schema:fetch` - GET /schemas/{version}
  - `snippet:generate` - POST /snippet (body: { type, format })
- **Runtime:** Node.js 20 (ESM)
- **Memory:** 512MB (sufficient for SDK)
- **Timeout:** 60s

### 3. **Cloud Storage** (Schema Mirror)
- **Bucket:** `mova-schemas-{PROJECT_ID}`
- **Structure:**
  ```
  /versions/
    /3.4.1/
      ├─ envelope.schema.json
      ├─ plan.schema.json
      └─ lexicon.json
  ```
- **Lifecycle:** 30-day retention for old versions
- **CDN:** Cloud CDN for global distribution

### 4. **Pub/Sub** (Event Bus)
- **Topics:**
  - `validation-events` - Schema validation results
  - `workflow-events` - Workflow execution events
  - `schema-updates` - Schema version updates
- **Subscriptions:** Dead-letter queue for failed events

### 5. **Cloud Workflows** (Orchestration)
- **Workflow 1:** Validation → Enrichment → Storage
  ```
  validate → extract-metadata → store-in-firestore → publish-event
  ```
- **Workflow 2:** Schema Sync
  ```
  check-for-updates → download-schemas → verify-schema → upload-to-gcs → notify
  ```

### 6. **Cloud Tasks** (Queue & Retry)
- **Queue:** `validation-retries`
- **Config:**
  - Max retries: 5
  - Min backoff: 0.1s
  - Max backoff: 600s
  - Max concurrent: 1000

### 7. **Secret Manager** (Credentials)
- **Secrets:**
  - `npm-token` - npm publish token
  - `executor-api-token` - Executor auth
  - `webhook-hmac-secret` - Webhook verification
  - `lsp-service-account-key` - Service account JWT

### 8. **Artifact Registry** (Container Images)
- **Repository:** `mova-lsp`
- **Images:**
  - `lsp-server:latest`
  - `validate-function:latest`
  - `executor:latest`

### 9. **Cloud Logging & Monitoring**
- **Structured Logs:** JSON format with traceId
- **Metrics:**
  - Validation latency (p50, p95, p99)
  - Error rates by type
  - Concurrency & throughput
- **Alerts:** >5% error rate, >5s p95 latency
- **Uptime Checks:** /health endpoint

### 10. **IAM Service Accounts**
- **lsp-service-account:** Cloud Run service
- **function-service-account:** Cloud Functions
- **ci-service-account:** GitHub Actions deployment
- **Roles (Minimal):**
  - Cloud Run: `roles/run.invoker`, read GCS, write Pub/Sub
  - Functions: `roles/cloudfunctions.invoker`, read GCS
  - CI: Secret Manager read, Artifact Registry push, Cloud Run deploy

---

## 🛠️ Implementation Phases

### Phase 1: Container & Infrastructure (Week 1-2)

#### 1.1 Create Dockerfile for LSP Server
```dockerfile
# packages/server-lsp/Dockerfile
FROM node:20-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/ ./packages/
RUN npm ci
RUN npm run build

FROM node:20-bullseye-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/server-lsp/dist ./dist
COPY --from=builder /app/package.json ./
RUN npm ci --production
EXPOSE 8080
CMD ["node", "--enable-source-maps", "dist/server.js"]
```

#### 1.2 Create Service Account & IAM
```bash
# Create service accounts
gcloud iam service-accounts create lsp-service --display-name="LSP Cloud Run"
gcloud iam service-accounts create function-service --display-name="Cloud Functions"
gcloud iam service-accounts create ci-service --display-name="GitHub Actions CI"

# Grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:lsp-service@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/run.invoker

# Storage access
gcloud storage buckets add-iam-policy-binding gs://mova-schemas-PROJECT_ID \
  --member=serviceAccount:lsp-service@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

#### 1.3 Create GCS Bucket for Schemas
```bash
gsutil mb -l us-central1 gs://mova-schemas-${PROJECT_ID}
gsutil versioning set on gs://mova-schemas-${PROJECT_ID}
gsutil lifecycle set lifecycle.json gs://mova-schemas-${PROJECT_ID}
```

### Phase 2: Cloud Functions (Week 2-3)

#### 2.1 Validate Function
```typescript
// packages/cloud-functions/validate/src/index.ts
import { Request, Response } from 'express';
import { validateDocument } from 'leryk-sdk-mova';

export async function validate(req: Request, res: Response) {
  try {
    const { text, format = 'json' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const result = await validateDocument(text);
    res.json(result);
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: String(error) });
  }
}
```

#### 2.2 Schema Fetch Function
```typescript
// packages/cloud-functions/schema-fetch/src/index.ts
import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket(`mova-schemas-${process.env.GCP_PROJECT_ID}`);

export async function schemaFetch(req: Request, res: Response) {
  try {
    const { version = '3.4.1' } = req.query;
    const file = bucket.file(`versions/${version}/envelope.schema.json`);
    const [exists] = await file.exists();
    
    if (!exists) {
      return res.status(404).json({ error: 'Schema not found' });
    }

    const [schema] = await file.download();
    res.setHeader('Content-Type', 'application/json');
    res.send(schema);
  } catch (error) {
    console.error('Schema fetch error:', error);
    res.status(500).json({ error: String(error) });
  }
}
```

#### 2.3 Snippet Generate Function
```typescript
// packages/cloud-functions/snippet-generate/src/index.ts
import { Request, Response } from 'express';

export async function snippetGenerate(req: Request, res: Response) {
  try {
    const { type, format = 'json' } = req.body;
    // Use SDK to generate snippet
    const snippet = generateSnippet(type, format);
    res.json({ snippet });
  } catch (error) {
    console.error('Snippet generation error:', error);
    res.status(500).json({ error: String(error) });
  }
}
```

### Phase 3: Cloud Run Deployment (Week 3-4)

#### 3.1 Build & Push Docker Image
```bash
# Build
docker build -t us-central1-docker.pkg.dev/${PROJECT_ID}/mova-lsp/lsp-server:latest \
  -f packages/server-lsp/Dockerfile .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/${PROJECT_ID}/mova-lsp/lsp-server:latest
```

#### 3.2 Deploy to Cloud Run
```bash
gcloud run deploy mova-lsp-server \
  --image us-central1-docker.pkg.dev/${PROJECT_ID}/mova-lsp/lsp-server:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 100 \
  --service-account lsp-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars GCP_PROJECT_ID=${PROJECT_ID},NODE_ENV=production
```

### Phase 4: Pub/Sub & Cloud Workflows (Week 4-5)

#### 4.1 Create Pub/Sub Topics
```bash
gcloud pubsub topics create validation-events
gcloud pubsub topics create workflow-events
gcloud pubsub topics create schema-updates

# Create subscriptions
gcloud pubsub subscriptions create validation-events-sub \
  --topic=validation-events \
  --dead-letter-topic=validation-events-dlq
```

#### 4.2 Deploy Cloud Workflows
```yaml
# workflows/validate-and-store.yaml
main:
  steps:
    - validate_step:
        call: http.post
        args:
          url: https://validate-function-${PROJECT_ID}.cloudfunctions.net/
          body: $${json.encode(input)}
        result: validation_result
    - enrich_step:
        call: googleapis.firestore.v1.projects.databases.documents.patch
        args:
          name: ${"projects/" + PROJECT_ID + "/databases/(default)/documents/envelopes/" + input.envelope_id}
          body:
            fields:
              validated: { booleanValue: $${validation_result.body.ok} }
    - publish_step:
        call: googleapis.pubsub.v1.projects.topics.publish
        args:
          topic: ${"projects/" + PROJECT_ID + "/topics/validation-events"}
          body:
            messages:
              - data: $${base64.encode(json.encode(validation_result))}
```

### Phase 5: GitHub Actions CI/CD (Week 5-6)

#### 5.1 GCP Deployment Workflow
```yaml
# .github/workflows/deploy-gcp.yml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker for Artifact Registry
        run: |
          gcloud auth configure-docker us-central1-docker.pkg.dev

      - name: Build and push Docker image
        run: |
          docker build -t us-central1-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/mova-lsp/lsp-server:latest \
            -f packages/server-lsp/Dockerfile .
          docker push us-central1-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/mova-lsp/lsp-server:latest

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy mova-lsp-server \
            --image us-central1-docker.pkg.dev/${{ env.GCP_PROJECT_ID }}/mova-lsp/lsp-server:latest \
            --platform managed \
            --region us-central1 \
            --service-account lsp-service@${{ env.GCP_PROJECT_ID }}.iam.gserviceaccount.com
```

---

## 🔒 Security Configuration

### 1. Secret Manager
```bash
# Store secrets
gcloud secrets create npm-token --data-file=<(echo $NPM_TOKEN)
gcloud secrets create executor-api-token --data-file=<(echo $EXECUTOR_TOKEN)
gcloud secrets create webhook-hmac-secret --data-file=<(echo $WEBHOOK_SECRET)

# Grant access
gcloud secrets add-iam-policy-binding npm-token \
  --member=serviceAccount:ci-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### 2. API Security
```typescript
// Middleware for API authentication
import { Request, Response, NextFunction } from 'express';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

async function authenticateRequest(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Verify token against Secret Manager
  const client = new SecretManagerServiceClient();
  const secret = await client.accessSecretVersion({
    name: `projects/${process.env.GCP_PROJECT_ID}/secrets/api-token/versions/latest`,
  });

  if (secret[0].payload?.data?.toString() !== token) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
}
```

### 3. Service Account Roles (Minimal Privilege)
```yaml
# LSP Service Account
roles:
  - roles/run.invoker # Self-invocation
  - roles/storage.objectViewer # Read schemas
  - roles/pubsub.publisher # Publish events
  - roles/cloudtrace.agent # Write traces

# Cloud Functions Service Account
roles:
  - roles/storage.objectViewer # Read schemas
  - roles/pubsub.publisher # Publish events
  - roles/secretmanager.secretAccessor # Read secrets

# CI Service Account
roles:
  - roles/artifactregistry.writer # Push images
  - roles/run.developer # Deploy Cloud Run
  - roles/cloudfunctions.developer # Deploy functions
  - roles/secretmanager.secretAccessor # Read tokens
```

---

## 📊 Monitoring & Observability

### 1. Structured Logging
```typescript
// Logging configuration
import { Logger } from '@google-cloud/logging';

const logging = new Logger();

function logRequest(traceId: string, message: string, data: any) {
  const entry = logging.entry(
    {
      severity: 'INFO',
      trace: `projects/${process.env.GCP_PROJECT_ID}/traces/${traceId}`,
      labels: {
        service: 'mova-lsp',
        version: process.env.LSP_VERSION,
      },
    },
    { message, data }
  );
  logging.write(entry);
}
```

### 2. Metrics
```typescript
// Using Cloud Monitoring
import { MetricServiceClient } from '@google-cloud/monitoring';

const client = new MetricServiceClient();

function recordValidationLatency(latencyMs: number) {
  const dataPoint = {
    interval: {
      endTime: { seconds: Math.floor(Date.now() / 1000) },
    },
    value: { doubleValue: latencyMs },
  };
  // Write metric
}
```

### 3. Alerting
```bash
# Create alert policy for error rate
gcloud alpha monitoring policies create \
  --notification-channels=${CHANNEL_ID} \
  --display-name="LSP Error Rate Alert" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5
```

---

## 📝 Configuration & Environment

### `.env.gcp` (Production)
```bash
# GCP Configuration
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
GCP_ARTIFACT_REGISTRY=mova-lsp

# Services
LSP_SERVER_URL=https://mova-lsp-server-${GCP_PROJECT_ID}.run.app
VALIDATE_FUNCTION_URL=https://us-central1-${GCP_PROJECT_ID}.cloudfunctions.net/validate
SCHEMA_BUCKET=gs://mova-schemas-${GCP_PROJECT_ID}

# Pub/Sub
PUBSUB_VALIDATION_TOPIC=validation-events
PUBSUB_WORKFLOW_TOPIC=workflow-events

# Secrets
SECRET_MANAGER_PREFIX=projects/${GCP_PROJECT_ID}/secrets
```

### GitHub Secrets
```
WIF_PROVIDER=projects/PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/providers/github-provider
WIF_SERVICE_ACCOUNT=ci-service@PROJECT_ID.iam.gserviceaccount.com
GCP_PROJECT_ID=your-project-id
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] GCP project created
- [ ] Billing enabled
- [ ] Service accounts created
- [ ] IAM roles assigned
- [ ] GCS bucket created
- [ ] Secret Manager secrets configured
- [ ] Artifact Registry repository created
- [ ] GitHub OIDC configured for CI/CD

### Deployment
- [ ] Cloud Functions deployed (validate, schema-fetch, snippet-generate)
- [ ] Docker image built and pushed
- [ ] Cloud Run service deployed
- [ ] Pub/Sub topics created
- [ ] Cloud Workflows deployed
- [ ] Cloud Logging configured
- [ ] Alerts configured
- [ ] Smoke tests passed

### Post-Deployment
- [ ] Health checks passing
- [ ] Logs flowing to Cloud Logging
- [ ] Metrics being collected
- [ ] Uptime checks configured
- [ ] Backup strategy configured
- [ ] Disaster recovery plan documented

---

## 🚀 Deployment Commands

```bash
# Set project
export PROJECT_ID=your-project-id
gcloud config set project ${PROJECT_ID}

# Create infrastructure
bash scripts/gcp/setup.sh

# Build images
bash scripts/gcp/build.sh

# Deploy services
bash scripts/gcp/deploy.sh

# Verify deployment
bash scripts/gcp/verify.sh
```

---

## 📚 Next Steps

1. **Setup GCP Project** - Create project and enable APIs
2. **Create Infrastructure** - IAM, service accounts, buckets
3. **Build Cloud Functions** - Implement validate, schema-fetch, snippet-generate
4. **Deploy LSP to Cloud Run** - Container deployment
5. **Configure Pub/Sub & Workflows** - Event orchestration
6. **Setup GitHub Actions** - Automated deployment
7. **Configure Monitoring** - Logging, metrics, alerts
8. **Performance Testing** - Load testing and optimization
9. **Security Audit** - Penetration testing and compliance
10. **Documentation** - Operational runbooks

---

**Status:** 📋 Ready for Implementation  
**Author:** Sergii Miasoiedov  
**License:** Apache 2.0
