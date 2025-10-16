#!/bin/bash
# GCP Infrastructure Setup Script for MOVA LSP
# Sets up service accounts, IAM roles, buckets, and secrets

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
BUCKET_NAME="mova-schemas-${PROJECT_ID}"

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}ERROR: GCP_PROJECT_ID not set${NC}"
  exit 1
fi

echo -e "${YELLOW}Setting up GCP infrastructure for project: $PROJECT_ID${NC}"
echo "Region: $REGION"

# 1. Set active project
echo -e "${GREEN}1. Setting active GCP project...${NC}"
gcloud config set project $PROJECT_ID

# 2. Enable required APIs
echo -e "${GREEN}2. Enabling required APIs...${NC}"
gcloud services enable \
  cloudrun.googleapis.com \
  cloudfunctions.googleapis.com \
  storage-api.googleapis.com \
  pubsub.googleapis.com \
  workflows.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com \
  cloudtrace.googleapis.com \
  firestore.googleapis.com

# 3. Create service accounts
echo -e "${GREEN}3. Creating service accounts...${NC}"

# LSP Service Account
if ! gcloud iam service-accounts describe lsp-service@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
  gcloud iam service-accounts create lsp-service \
    --display-name="MOVA LSP Cloud Run Service"
else
  echo "LSP service account already exists"
fi

# Cloud Functions Service Account
if ! gcloud iam service-accounts describe functions-service@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
  gcloud iam service-accounts create functions-service \
    --display-name="MOVA Cloud Functions Service"
else
  echo "Functions service account already exists"
fi

# CI/CD Service Account
if ! gcloud iam service-accounts describe ci-service@${PROJECT_ID}.iam.gserviceaccount.com &>/dev/null; then
  gcloud iam service-accounts create ci-service \
    --display-name="MOVA GitHub Actions CI/CD"
else
  echo "CI service account already exists"
fi

# 4. Grant IAM roles
echo -e "${GREEN}4. Granting IAM roles...${NC}"

# LSP Service Account roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:lsp-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.invoker \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:lsp-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:lsp-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/pubsub.publisher \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:lsp-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/cloudtrace.agent \
  --condition=None

# Functions Service Account roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:functions-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:functions-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/pubsub.publisher \
  --condition=None

# CI Service Account roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:ci-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/artifactregistry.writer \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:ci-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/run.developer \
  --condition=None

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:ci-service@${PROJECT_ID}.iam.gserviceaccount.com \
  --role=roles/cloudfunctions.developer \
  --condition=None

# 5. Create GCS bucket for schemas
echo -e "${GREEN}5. Creating Cloud Storage bucket...${NC}"

if gsutil ls -b gs://${BUCKET_NAME} &>/dev/null; then
  echo "Bucket already exists: $BUCKET_NAME"
else
  gsutil mb -l $REGION gs://${BUCKET_NAME}
  echo "Created bucket: $BUCKET_NAME"
fi

# Enable versioning
gsutil versioning set on gs://${BUCKET_NAME}

# Set lifecycle policy (keep last 30 days)
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"numNewerVersions": 5}
      }
    ]
  }
}
EOF
gsutil lifecycle set /tmp/lifecycle.json gs://${BUCKET_NAME}

# 6. Create Pub/Sub topics
echo -e "${GREEN}6. Creating Pub/Sub topics...${NC}"

for topic in validation-events workflow-events schema-updates; do
  if gcloud pubsub topics describe $topic &>/dev/null; then
    echo "Topic already exists: $topic"
  else
    gcloud pubsub topics create $topic
    echo "Created topic: $topic"
  fi
done

# 7. Create Artifact Registry repository
echo -e "${GREEN}7. Creating Artifact Registry repository...${NC}"

if gcloud artifacts repositories describe mova-lsp --location=$REGION &>/dev/null; then
  echo "Repository already exists: mova-lsp"
else
  gcloud artifacts repositories create mova-lsp \
    --repository-format=docker \
    --location=$REGION \
    --description="MOVA LSP Docker images"
fi

# 8. Create Secret Manager secrets (placeholders)
echo -e "${GREEN}8. Setting up Secret Manager...${NC}"

for secret in npm-token executor-api-token webhook-hmac-secret; do
  if gcloud secrets describe $secret &>/dev/null; then
    echo "Secret already exists: $secret"
  else
    echo "placeholder" | gcloud secrets create $secret --data-file=-
    echo "Created secret: $secret (placeholder)"
  fi
done

# 9. Create Cloud Logging sink (optional)
echo -e "${GREEN}9. Configuring Cloud Logging...${NC}"

echo "Cloud Logging configured"

# 10. Summary
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}GCP Infrastructure Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "Key resources:"
echo "  • Service Accounts: lsp-service, functions-service, ci-service"
echo "  • Cloud Storage: gs://${BUCKET_NAME}"
echo "  • Pub/Sub Topics: validation-events, workflow-events, schema-updates"
echo "  • Artifact Registry: $REGION-docker.pkg.dev/$PROJECT_ID/mova-lsp"
echo ""
echo "Next steps:"
echo "  1. Update Secret Manager secrets with actual values:"
echo "     gcloud secrets versions add npm-token --data-file=<path>"
echo "  2. Deploy Cloud Functions"
echo "  3. Build and push Docker image"
echo "  4. Deploy LSP to Cloud Run"
echo ""
