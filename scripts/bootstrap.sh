#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/terraform/bootstrap"

echo "Applying bootstrap..."
terraform init -input=false
terraform apply -auto-approve

ROLE_ARN=$(terraform output -raw github_actions_role_arn)

echo "Setting GitHub Actions variable..."
gh variable set AWS_GITHUB_ACTIONS_ROLE_ARN \
  --body "$ROLE_ARN" \
  --repo hienmarc/money-collection-app

echo "Bootsrap done !"