#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# VenueFlow — Google Cloud Run Deploy Script
# Usage: bash deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config (edit these) ───────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-}"          # set via env or enter below
REGION="${GCP_REGION:-asia-south1}"       # closest to India
SERVICE_NAME="venueflow"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# ── Prompt for missing vars ───────────────────────────────────────────────────
if [ -z "$PROJECT_ID" ]; then
  read -rp "Enter your GCP Project ID: " PROJECT_ID
  IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"
fi

if [ -z "${GEMINI_API_KEY:-}" ]; then
  read -rp "Enter your Gemini API Key: " GEMINI_API_KEY
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🏟️  VenueFlow Cloud Run Deployer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Project : $PROJECT_ID"
echo "  Region  : $REGION"
echo "  Image   : $IMAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Set active project ────────────────────────────────────────────────────────
gcloud config set project "$PROJECT_ID"

# ── Enable required APIs ──────────────────────────────────────────────────────
echo "🔧 Enabling Cloud APIs…"
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  --quiet

# ── Build & push image ────────────────────────────────────────────────────────
echo "🐳 Building Docker image with Cloud Build…"
gcloud builds submit --tag "$IMAGE" .

# ── Deploy to Cloud Run ───────────────────────────────────────────────────────
echo "🚀 Deploying to Cloud Run…"
gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=${GEMINI_API_KEY},NODE_ENV=production" \
  --memory 512Mi \
  --cpu 1 \
  --concurrency 80 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 60 \
  --quiet

# ── Get URL ───────────────────────────────────────────────────────────────────
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format 'value(status.url)')

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  DEPLOYED SUCCESSFULLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 Cloud Run URL: $SERVICE_URL"
echo "  🩺 Health Check : ${SERVICE_URL}/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Copy this URL for your Hack2Skill submission: $SERVICE_URL"
