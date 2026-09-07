resource "neon_project" "coworking_db_project" {
  name                      = "coworking-db"
  region_id                 = "aws-us-east-2"
  pg_version                = 16
  history_retention_seconds = 21600
  org_id                    = var.neon_org_id
}

resource "render_web_service" "backend_api" {
  name               = "coworking-backend-api"
  plan               = var.render_backend_plan
  region             = "ohio"
  start_command      = "pnpm --filter backend start"
  pre_deploy_command = "pnpm --filter backend prisma:migrate:deploy"

  runtime_source = {
    native_runtime = {
      runtime       = "node"
      build_command = "corepack enable && pnpm install --frozen-lockfile && pnpm --filter backend prisma:generate && pnpm --filter backend build"
      repo_url      = var.github_repo_url
      branch        = var.github_branch
      auto_deploy   = true
      build_filter = {
        paths = ["backend/**", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]
      }
    }
  }

  health_check_path = "/api/v1/health"

  env_vars = {
    NODE_ENV = { value = "production" }
    NODE_VERSION = { value = "22" }
    JWT_ACCESS_SECRET = { generate_value = true }
    DATABASE_URL = { value = neon_project.coworking_db_project.connection_uri }
  }
}

resource "render_static_site" "frontend_spa" {
  name          = "coworking-frontend-app"
  build_command = "corepack enable && pnpm install --frozen-lockfile && pnpm --filter frontend build"
  publish_path  = "frontend/dist"
  auto_deploy   = true
  repo_url      = var.github_repo_url
  branch        = var.github_branch

  build_filter = {
    paths = ["frontend/**", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"]
  }

  env_vars = {
    VITE_USE_MSW       = { value = "false" }
    VITE_API_BASE_URL  = { value = "${render_web_service.backend_api.url}/api/v1" }
  }

  routes = [{
    type        = "rewrite"
    source      = "/*"
    destination = "/index.html"
  }]
}
