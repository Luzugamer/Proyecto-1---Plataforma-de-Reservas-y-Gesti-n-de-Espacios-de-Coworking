# 1. Crear Base de Datos PostgreSQL Serverless en Neon
resource "neon_project" "coworking_db_project" {
  name                      = "coworking-db"
  region_id                 = "aws-us-east-2" # Región de baja latencia con Render
  pg_version                = 16
  history_retention_seconds = 21600           # 6 horas (Límite máximo Free Tier de Neon)
  org_id                    = var.neon_org_id
}

# 2. Desplegar Backend Fastify en Render (Web Service Gratuito)
resource "render_web_service" "backend_api" {
  name          = "coworking-backend-api"
  plan          = "free"
  region        = "ohio" # Misma región de US East que Neon
  start_command = "pnpm start"

  runtime_source = {
    native_runtime = {
      runtime       = "node"
      build_command = "pnpm install && pnpm prisma:generate && pnpm build"
      repo_url      = var.github_repo_url
      branch        = var.github_branch
      auto_deploy   = true
      build_filter = {
        paths         = ["backend/**"]
        ignored_paths = ["frontend/**"]
      }
    }
  }

  root_directory = "backend"

  env_vars = {
    NODE_ENV = {
      value = "production"
    }
    PORT = {
      value = "10000"
    }
    JWT_SECRET = {
      value = var.jwt_secret
    }
    DATABASE_URL = {
      value = neon_project.coworking_db_project.connection_uri
    }
  }
}

# 3. Desplegar Frontend React/Vite en Render (Static Site Gratuito)
resource "render_static_site" "frontend_spa" {
  name          = "coworking-frontend-app"
  build_command = "pnpm install && pnpm build"
  publish_path  = "dist"
  
  build_filter = {
    paths         = ["frontend/**"]
    ignored_paths = ["backend/**"]
  }
  
  auto_deploy = true
  repo_url    = var.github_repo_url
  branch      = var.github_branch
  root_directory = "frontend"

  env_vars = {
    VITE_USE_MSW = {
      value = "false"
    }
    VITE_API_BASE_URL = {
      value = "${render_web_service.backend_api.url}/api/v1"
    }
  }

  # Configuración SPA (Redirigir rutas al index.html de React Router)
  routes = [
    {
      type   = "rewrite"
      source = "/*"
      destination = "/index.html"
    }
  ]
}