terraform {
  required_version = ">= 1.5.0"
  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.6.0"
    }
    render = {
      source  = "render-oss/render"
      version = ">= 1.9.0"
    }
  }
}

provider "neon" {
  api_key = var.neon_api_key
}

provider "render" {
  api_key  = var.render_api_key
  owner_id = var.render_owner_id
}