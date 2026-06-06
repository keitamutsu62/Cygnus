variable "domain" {}
variable "acm_cert_arn" {}
variable "vpc_id" {}
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "db_endpoint" {}
variable "db_password" { sensitive = true }
variable "jwt_secret" { sensitive = true }
variable "app_image" {
  description = "ECR image URI for LOOP backend"
  default     = "219078481395.dkr.ecr.ap-northeast-1.amazonaws.com/cygnus-loop-backend:latest"
}
