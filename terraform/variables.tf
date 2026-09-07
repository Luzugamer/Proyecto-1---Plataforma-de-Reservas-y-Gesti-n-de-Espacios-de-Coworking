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
  default     = "https://github.com/Luzugamer/Proyecto-1---Plataforma-de-Reservas-y-Gesti-n-de-Espacios-de-Coworking.git"
}

variable "github_branch" {
  type        = string
  description = "Rama a desplegar"
  default     = "main"
}

variable "render_backend_plan" {
  type        = string
  description = "Plan del Web Service de Render"
  default     = "free"

  validation {
    condition     = contains(["free", "starter", "standard", "pro", "pro_plus", "pro_max", "pro_ultra"], var.render_backend_plan)
    error_message = "render_backend_plan debe ser un plan de Web Service válido en Render."
  }
}
