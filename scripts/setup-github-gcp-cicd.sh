#!/usr/bin/env bash
set -euo pipefail

die() {
  echo "錯誤：$1" >&2
  exit 1
}

command -v gcloud >/dev/null || die "找不到 gcloud CLI"
command -v gh >/dev/null || die "找不到 GitHub CLI gh"
command -v git >/dev/null || die "找不到 git"

gh auth status >/dev/null 2>&1 || die "請先執行 gh auth login"
gcloud auth list --filter=status:ACTIVE --format='value(account)' | grep -q . || die "請先執行 gcloud auth login"

REMOTE_URL="$(git remote get-url origin 2>/dev/null || true)"
case "$REMOTE_URL" in
  https://github.com/*) GITHUB_REPO="${REMOTE_URL#https://github.com/}" ;;
  git@github.com:*) GITHUB_REPO="${REMOTE_URL#git@github.com:}" ;;
  *) GITHUB_REPO="" ;;
esac
GITHUB_REPO="${GITHUB_REPO%.git}"

DEFAULT_PROJECT="$(gcloud config get-value project 2>/dev/null || true)"
DEFAULT_REGION="asia-east1"
DEFAULT_SERVICE="event-checkin"
DEFAULT_REPOSITORY="event-checkin"

read -r -p "GCP Project ID${DEFAULT_PROJECT:+ [$DEFAULT_PROJECT]}: " PROJECT_ID
PROJECT_ID="${PROJECT_ID:-$DEFAULT_PROJECT}"
read -r -p "Cloud Run region [$DEFAULT_REGION]: " REGION
REGION="${REGION:-$DEFAULT_REGION}"
read -r -p "Cloud Run service [$DEFAULT_SERVICE]: " SERVICE
SERVICE="${SERVICE:-$DEFAULT_SERVICE}"
read -r -p "Artifact Registry repository [$DEFAULT_REPOSITORY]: " REPOSITORY
REPOSITORY="${REPOSITORY:-$DEFAULT_REPOSITORY}"
read -r -p "GitHub repository owner/name${GITHUB_REPO:+ [$GITHUB_REPO]}: " INPUT_REPO
GITHUB_REPO="${INPUT_REPO:-$GITHUB_REPO}"

[[ -n "$PROJECT_ID" ]] || die "GCP Project ID 不可為空"
[[ "$GITHUB_REPO" == */* ]] || die "GitHub repository 必須是 owner/name"

POOL="github-actions"
PROVIDER="github-provider"
DEPLOYER_ACCOUNT="github-deployer"
DEPLOYER_EMAIL="${DEPLOYER_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
WIF_PROVIDER="projects/$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}"

echo ""
echo "將設定："
echo "  GitHub: $GITHUB_REPO"
echo "  GCP:    $PROJECT_ID / $REGION"
echo "  Cloud Run: $SERVICE"
echo ""
read -r -p "繼續執行？[y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || exit 0

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  iamcredentials.googleapis.com \
  iam.googleapis.com

gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Event Check-in Docker images"

gcloud iam service-accounts describe "$DEPLOYER_EMAIL" >/dev/null 2>&1 || \
  gcloud iam service-accounts create "$DEPLOYER_ACCOUNT" \
    --display-name="GitHub Actions Cloud Run deployer"

for ROLE in \
  roles/artifactregistry.writer \
  roles/cloudbuild.builds.editor \
  roles/run.admin \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$DEPLOYER_EMAIL" \
    --role="$ROLE" \
    --quiet >/dev/null
done

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUD_BUILD_ACCOUNT="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CLOUD_BUILD_ACCOUNT" \
  --role="roles/artifactregistry.writer" \
  --quiet >/dev/null

gcloud iam workload-identity-pools describe "$POOL" \
  --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "$POOL" \
    --location=global \
    --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers describe "$PROVIDER" \
  --workload-identity-pool="$POOL" \
  --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --workload-identity-pool="$POOL" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="attribute.repository == '$GITHUB_REPO' && attribute.ref == 'refs/heads/main'"

gcloud iam service-accounts add-iam-policy-binding "$DEPLOYER_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository/$GITHUB_REPO" \
  --quiet >/dev/null

gh variable set GCP_PROJECT_ID --repo "$GITHUB_REPO" --body "$PROJECT_ID"
gh variable set GCP_REGION --repo "$GITHUB_REPO" --body "$REGION"
gh variable set CLOUD_RUN_SERVICE --repo "$GITHUB_REPO" --body "$SERVICE"
gh variable set ARTIFACT_REGISTRY_REPOSITORY --repo "$GITHUB_REPO" --body "$REPOSITORY"
gh secret set GCP_WIF_PROVIDER --repo "$GITHUB_REPO" --body "$WIF_PROVIDER"
gh secret set GCP_SERVICE_ACCOUNT --repo "$GITHUB_REPO" --body "$DEPLOYER_EMAIL"

echo ""
echo "設定完成。現在執行："
echo "  git add . && git commit -m 'feat(ci): deploy Docker app to Cloud Run'"
echo "  git push origin main"
