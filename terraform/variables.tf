variable "neon_api_key" {
  type        = string
  description = "API Key de Neon.tech"
  sensitive   = true
}

variable "neon_org_id" {
  type        = string
  description = "Organization ID de Neon.tech (ej: org-xxx)"
  default     = null
}

variable "render_api_key" {
  type        = string
  description = "API Key de Render.com"
  sensitive   = true
}

variable "render_owner_id" {
  type        = string
  description = "Owner ID de tu cuenta o equipo en Render"
}

variable "github_repo_url" {
  type        = string
  description = "URL HTTPS de tu repositorio de GitHub"
  default     = "https://github.com/TU_USUARIO/TU_REPOSITORIO"
}

variable "github_branch" {
  type        = string
  description = "Rama a desplegar"
  default     = "main"
}

variable "jwt_secret" {
  type        = string
  description = "Secreto para firmar tokens JWT"
  default     = "super_secret_jwt_key_coworking_2026_prod"
  sensitive   = true
}