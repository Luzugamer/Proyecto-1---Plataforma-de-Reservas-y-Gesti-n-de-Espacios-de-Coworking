output "database_connection_string" {
  value       = neon_project.coworking_db_project.connection_uri
  description = "Cadena de conexión segura a PostgreSQL en Neon"
  sensitive   = true
}

output "backend_url" {
  value       = render_web_service.backend_api.url
  description = "URL pública de la API Fastify"
}

output "frontend_url" {
  value       = render_static_site.frontend_spa.url
  description = "URL pública del Frontend React en Render"
}