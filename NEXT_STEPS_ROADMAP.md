# 🚀 MOVA LSP - Next Steps Roadmap

**Current Status:** MVP Complete & Published ✅  
**Date:** October 16, 2025  
**Version:** 0.1.0

---

## 📊 Project Achievements

### ✅ Completed Phases

#### Phase 1: MVP Development
- ✅ Language Server Protocol full implementation
- ✅ SDK with AJV 8.17.1 validator
- ✅ CLI tooling (validate, schema:sync, snippet:generate)
- ✅ VS Code extension client
- ✅ 5 npm packages with ESM/TypeScript
- ✅ 26/26 integration tests passing
- ✅ 0 security vulnerabilities

#### Phase 2: Publishing & CI/CD
- ✅ Published all packages to npm
- ✅ GitHub repository setup (Leryk1981/MOVA_JSON)
- ✅ GitHub Actions CI/CD pipeline
- ✅ Apache 2.0 licensing
- ✅ Automated npm publishing via changesets
- ✅ Docker image ready for Cloud Run

#### Phase 3: Planning
- ✅ GCP Integration guide created
- ✅ Infrastructure setup script (setup.sh)
- ✅ 5-phase deployment plan documented
- ✅ Security & monitoring architecture defined

---

## 🎯 Next Phase: GCP Cloud Deployment (6-8 weeks)

### Timeline & Phases

```
┌─ Week 1-2: Infrastructure Setup
│  ├─ GCP Project creation & enablement
│  ├─ Service accounts & IAM roles
│  ├─ GCS bucket for schemas
│  ├─ Pub/Sub topics & subscriptions
│  └─ Artifact Registry setup
│
├─ Week 2-3: Cloud Functions
│  ├─ validate function (POST /validate)
│  ├─ schema:fetch function (GET /schemas/{version})
│  ├─ snippet:generate function (POST /snippet)
│  ├─ Error handling & retries
│  └─ Comprehensive testing
│
├─ Week 3-4: Cloud Run Deployment
│  ├─ Docker image build & optimization
│  ├─ Push to Artifact Registry
│  ├─ Deploy LSP server to Cloud Run
│  ├─ Configure health checks & monitoring
│  └─ Performance testing (load testing)
│
├─ Week 4-5: Pub/Sub & Workflows
│  ├─ Create Pub/Sub topics
│  ├─ Implement Cloud Workflows
│  ├─ Event orchestration pipeline
│  ├─ Dead-letter queue handling
│  └─ Workflow testing & validation
│
├─ Week 5-6: GitHub Actions Integration
│  ├─ OIDC federation setup
│  ├─ Automated Docker build & push
│  ├─ Automated Cloud Run deployment
│  ├─ Smoke tests post-deploy
│  └─ Rollback procedures
│
└─ Week 6-8: Testing & Hardening
   ├─ Load testing (1000+ concurrent users)
   ├─ Chaos engineering tests
   ├─ Security penetration testing
   ├─ Performance optimization
   └─ Production readiness review
```

---

## 📋 Detailed Implementation Plan

### Phase 1: GCP Infrastructure (Week 1-2)

#### 1.1 GCP Project Setup
```bash
# Create project
gcloud projects create mova-lsp --name="MOVA Language Server Protocol"

# Set project
export GCP_PROJECT_ID=mova-lsp
gcloud config set project $GCP_PROJECT_ID

# Enable billing
gcloud billing projects link $GCP_PROJECT_ID --billing-account=<ACCOUNT_ID>

# Run infrastructure setup
GCP_PROJECT_ID=$GCP_PROJECT_ID GCP_REGION=us-central1 bash scripts/gcp/setup.sh
```

**Deliverable:** Infrastructure script runs successfully, all resources created

#### 1.2 Service Account OIDC for GitHub
```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project=$GCP_PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project=$GCP_PROJECT_ID \
  --location=global \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.aud=assertion.aud,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Grant access to CI service account
gcloud iam service-accounts add-iam-policy-binding \
  ci-service@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$GCP_PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/attribute.repository/Leryk1981/MOVA_JSON"
```

**Deliverable:** GitHub can authenticate to GCP without long-lived keys

#### 1.3 GCS Schema Mirror
```bash
# Upload schemas to GCS
gsutil -m cp packages/schemas/src/*.json gs://mova-schemas-$GCP_PROJECT_ID/versions/3.4.1/

# Enable CDN
gcloud compute backend-buckets create mova-schemas \
  --gcs-uri-prefix=gs://mova-schemas-$GCP_PROJECT_ID/ \
  --enable-cdn

# Test retrieval
curl https://mova-schemas-$GCP_PROJECT_ID.c.storage.googleapis.com/versions/3.4.1/envelope.schema.json
```

**Deliverable:** Schemas available globally via CDN with low latency

---

### Phase 2: Cloud Functions (Week 2-3)

#### 2.1 Create Cloud Functions

**Directory structure:**
```
packages/cloud-functions/
├── validate/
│   ├── src/
│   │   ├── index.ts
│   │   └── handlers.ts
│   ├── package.json
│   └── tsconfig.json
├── schema-fetch/
│   ├── src/
│   │   ├── index.ts
│   │   └── storage.ts
│   ├── package.json
│   └── tsconfig.json
└── snippet-generate/
    ├── src/
    │   ├── index.ts
    │   └── generators.ts
    ├── package.json
    └── tsconfig.json
```

#### 2.2 Validation Function
```typescript
// packages/cloud-functions/validate/src/index.ts
import { Request, Response } from 'express';
import { validateDocument, initializeValidator } from 'leryk-sdk-mova';

let initialized = false;

export async function validate(req: Request, res: Response) {
  try {
    // Initialize on first call
    if (!initialized) {
      await initializeValidator();
      initialized = true;
    }

    const { text, filepath } = req.body;

    if (!text) {
      return res.status(400).json({
        error: 'Missing required field: text',
        code: 'INVALID_REQUEST'
      });
    }

    // Validate document
    const result = await validateDocument(text, filepath);

    // Cache result (1 hour)
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      ok: result.ok,
      diagnostics: result.diagnostics || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({
      error: 'Validation failed',
      message: error instanceof Error ? error.message : String(error),
      code: 'VALIDATION_ERROR'
    });
  }
}
```

**Deploy:**
```bash
cd packages/cloud-functions/validate
gcloud functions deploy validate-mova \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --entry-point validate \
  --timeout 60 \
  --memory 512MB
```

#### 2.3 Schema Fetch Function
- GET `/schemas/{version}` - fetch schema from GCS
- Cache headers for CDN optimization
- Error handling for missing versions
- Rate limiting per user

#### 2.4 Snippet Generation Function
- POST `/snippet` - generate workflow template
- Support multiple formats (JSON, YAML)
- Cache common snippets
- Integrate with lexicon registry

**Deliverable:** All 3 functions deployed and tested

---

### Phase 3: Cloud Run LSP Server (Week 3-4)

#### 3.1 Build Docker Image

```bash
# Build image
docker build \
  -t us-central1-docker.pkg.dev/$GCP_PROJECT_ID/mova-lsp/lsp-server:latest \
  -t us-central1-docker.pkg.dev/$GCP_PROJECT_ID/mova-lsp/lsp-server:0.1.0 \
  -f packages/server-lsp/Dockerfile .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/$GCP_PROJECT_ID/mova-lsp/lsp-server:latest
```

#### 3.2 Deploy to Cloud Run

```bash
gcloud run deploy mova-lsp-server \
  --image us-central1-docker.pkg.dev/$GCP_PROJECT_ID/mova-lsp/lsp-server:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 100 \
  --min-instances 1 \
  --concurrency 100 \
  --service-account lsp-service@$GCP_PROJECT_ID.iam.gserviceaccount.com \
  --set-env-vars GCP_PROJECT_ID=$GCP_PROJECT_ID,NODE_ENV=production \
  --enable-http2
```

#### 3.3 Configure Monitoring

```bash
# Create uptime check
gcloud monitoring uptime create \
  --display-name="MOVA LSP Health" \
  --resource-type="uptime-url" \
  --monitored-resource="https://mova-lsp-server-${GCP_PROJECT_ID}.run.app/health"

# Create alert policy
gcloud alpha monitoring policies create \
  --notification-channels=$CHANNEL_ID \
  --display-name="LSP Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=5
```

**Deliverable:** LSP Server running on Cloud Run with health checks

---

### Phase 4: Pub/Sub & Workflows (Week 4-5)

#### 4.1 Event-Driven Architecture

```yaml
# workflows/validate-workflow.yaml
main:
  steps:
    - validate:
        call: http.post
        args:
          url: https://validate-mova.cloudfunctions.net
          body:
            text: ${input.envelope_text}
        result: validation_result
    
    - check_valid:
        switch:
          - condition: ${validation_result.body.ok}
            next: store_success
        next: store_failure
    
    - store_success:
        call: googleapis.firestore.v1.projects.databases.documents.createDocument
        args:
          collectionId: "validated-envelopes"
          body:
            fields:
              text: {stringValue: ${input.envelope_text}}
              valid: {booleanValue: true}
              timestamp: {timestampValue: ${now()}}
        result: stored
    
    - publish_success:
        call: googleapis.pubsub.v1.projects.topics.publish
        args:
          topic: ${"projects/" + env.GOOGLE_CLOUD_PROJECT_ID + "/topics/validation-events"}
          body:
            messages:
              - data: ${base64.encode(json.encode({status: "valid", id: stored.body.name}))}
    
    - store_failure:
        call: googleapis.firestore.v1.projects.databases.documents.createDocument
        args:
          collectionId: "validation-errors"
          body:
            fields:
              error: {stringValue: ${json.encode(validation_result.body.diagnostics)}}
              timestamp: {timestampValue: ${now()}}
    
    - publish_failure:
        call: googleapis.pubsub.v1.projects.topics.publish
        args:
          topic: ${"projects/" + env.GOOGLE_CLOUD_PROJECT_ID + "/topics/validation-events"}
          body:
            messages:
              - data: ${base64.encode(json.encode({status: "invalid", errors: validation_result.body.diagnostics}))}
    
    - return_result:
        return: ${validation_result.body}
```

#### 4.2 Cloud Tasks for Retries

```bash
# Create task queue
gcloud tasks queues create validation-retries \
  --location=us-central1 \
  --max-concurrent-dispatches=1000 \
  --max-dispatches-per-second=100
```

**Deliverable:** Event-driven workflow with retries and dead-letter handling

---

### Phase 5: GitHub Actions CD (Week 5-6)

#### 5.1 Deployment Workflow

```yaml
# .github/workflows/deploy-cloud-run.yml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
    paths:
      - 'packages/server-lsp/**'
      - 'packages/sdk/**'
      - 'packages/schemas/**'
      - '.github/workflows/deploy-cloud-run.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: 'read'
      id-token: 'write'

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
          IMAGE_TAG="us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/mova-lsp/lsp-server:${{ github.sha }}"
          LATEST_TAG="us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/mova-lsp/lsp-server:latest"
          
          docker build -t $IMAGE_TAG -t $LATEST_TAG -f packages/server-lsp/Dockerfile .
          docker push $IMAGE_TAG
          docker push $LATEST_TAG

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy mova-lsp-server \
            --image us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/mova-lsp/lsp-server:latest \
            --platform managed \
            --region us-central1 \
            --service-account lsp-service@${{ secrets.GCP_PROJECT_ID }}.iam.gserviceaccount.com
            
      - name: Run smoke tests
        run: |
          SERVICE_URL=$(gcloud run services describe mova-lsp-server --platform managed --region us-central1 --format 'value(status.url)')
          curl -X GET $SERVICE_URL/health

      - name: Create deployment comment
        if: github.event_name == 'push'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Deployed to Cloud Run'
            })
```

**Deliverable:** Automated deployment pipeline with smoke tests

---

### Phase 6: Testing & Hardening (Week 6-8)

#### 6.1 Load Testing

```bash
# Install load testing tool
npm install -g artillery

# Create load test profile
cat > load-test.yml << 'EOF'
config:
  target: "https://mova-lsp-server-{{ projectId }}.run.app"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Spike test"

scenarios:
  - name: "Validation workflow"
    flow:
      - post:
          url: "/validate"
          json:
            text: '{"version": "3.4.1", "metadata": {}, "plan": {"steps": []}}'
EOF

# Run test
artillery run load-test.yml
```

#### 6.2 Security Testing

```bash
# OWASP ZAP scanning
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://mova-lsp-server-${GCP_PROJECT_ID}.run.app

# Trivy image scanning
trivy image us-central1-docker.pkg.dev/$GCP_PROJECT_ID/mova-lsp/lsp-server:latest

# Checkov IaC scanning
checkov -d scripts/gcp/
```

#### 6.3 Performance Optimization

- Implement response caching
- Database query optimization
- Connection pooling
- Memory profiling & leaks
- CPU optimization

**Deliverable:** 
- Load test results (p95 < 500ms)
- Zero security vulnerabilities
- Performance optimization report

---

## 📊 Success Metrics

### Performance
- [ ] Response latency p95: < 500ms
- [ ] Throughput: > 1000 req/s
- [ ] Error rate: < 0.1%
- [ ] Uptime: > 99.9%

### Reliability
- [ ] All functions passing tests
- [ ] Proper error handling
- [ ] Graceful degradation
- [ ] Failover mechanisms

### Security
- [ ] 0 vulnerabilities
- [ ] OWASP Top 10 compliant
- [ ] TLS 1.3+
- [ ] Rate limiting active

### Operations
- [ ] Monitoring & alerts
- [ ] Structured logging
- [ ] Distributed tracing
- [ ] Runbooks documented

---

## 📚 Documentation Needed

1. **Deployment Guide** - Step-by-step GCP deployment
2. **Operational Runbook** - Incident response procedures
3. **Architecture Diagram** - System design documentation
4. **API Reference** - Cloud Functions & Cloud Run endpoints
5. **Troubleshooting Guide** - Common issues & solutions

---

## 🎯 Milestones

- **Week 1-2:** ✅ Infrastructure ready
- **Week 3:** Cloud Functions deployed
- **Week 4:** Cloud Run LSP server live
- **Week 5:** Event orchestration working
- **Week 6:** Automated CI/CD operational
- **Week 7-8:** Production hardened & tested

---

## 🚀 Post-Launch

### Monitoring & Maintenance
- Daily health checks
- Weekly performance review
- Monthly security audit
- Quarterly cost optimization

### Feature Roadmap (v0.2+)
- [ ] Advanced LSP features (rename, references)
- [ ] Multi-tenant support
- [ ] Custom validator extensions
- [ ] AI-powered suggestions
- [ ] Marketplace integration

### SLA & Support
- Development support: 24/7
- Security patches: 24h
- Performance degradation: 4h
- Feature requests: roadmap

---

**Status:** Ready for Phase 4 - GCP Cloud Deployment  
**Author:** Sergii Miasoiedov  
**License:** Apache 2.0
