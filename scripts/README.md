# Scripts

- `local-deploy.sh`: starts the local stack with `--start`, stops it with `--stop`, or stops the frontend and Redis while keeping Supabase running with `--stop-keep-db`.
- `bootstrap.sh`: provisions the AWS GitHub Actions OIDC role and sets its ARN as a repository variable. Takes no arguments.
