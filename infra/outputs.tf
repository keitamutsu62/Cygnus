output "loop_url" {
  value = "https://loop.${var.domain}"
}

output "studio_url" {
  value = "https://studio.${var.domain}"
}

output "api_url" {
  value = "https://api.${var.domain}"
}

output "rds_endpoint" {
  value     = module.database.endpoint
  sensitive = true
}
