#!/usr/bin/env bash
set -euo pipefail

cd terraform/bootstrap

echo "Applying bootstrap..."
terraform init -input=false
terraform apply -auto-approve

ROLE_ARN=$(terraform output -raw github_actions_role_arn)

echo "Setting GitHub Actions variable..."
gh variable set AWS_GITHUB_ACTIONS_ROLE_ARN \
  --body "$ROLE_ARN" \
  --repo hienmarc/money-collection-app

cd ../..
echo "Bootsrap done !"