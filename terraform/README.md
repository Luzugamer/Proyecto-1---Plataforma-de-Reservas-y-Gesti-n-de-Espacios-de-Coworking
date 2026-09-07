# Infraestructura Neon + Render

Esta configuración crea un proyecto PostgreSQL en Neon, un Web Service de Render para Fastify y un Static Site para React. No crea Redis.

## Requisitos

- Terraform `>= 1.5`.
- API keys de Neon y Render y el owner ID de Render.
- Acceso de Render al repositorio Git configurado en `github_repo_url`.
- Un plan de Web Service compatible con el provider `render-oss/render` 1.9.1. El valor por defecto es `starter`, que puede generar cargos.

Los secretos deben declararse por variables de entorno (`TF_VAR_neon_api_key`, `TF_VAR_render_api_key`, `TF_VAR_render_owner_id`) o en un archivo `*.tfvars` local ignorado por Git. Nunca deben versionarse.

## Flujo seguro

```text
terraform init
terraform fmt -check
terraform validate
terraform plan -out=coworking.tfplan
```

Revisar el plan antes de ejecutar `terraform apply coworking.tfplan`. El pre-deploy del backend ejecuta `prisma migrate deploy`; no ejecuta el seed destructivo. La migración inicial incluye los planes de membresía mínimos.

El estado de Terraform contiene valores sensibles, incluida la conexión a Neon. Debe guardarse en un backend remoto cifrado para trabajo compartido.
