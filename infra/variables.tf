variable "aws_region" {
  default = "ap-northeast-1"
}

variable "domain" {
  default = "cygnus.style"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "admin_token" {
  description = "Admin dashboard shared token"
  type        = string
  sensitive   = true
}

variable "ses_from" {
  description = "SES sender email for order notifications"
  type        = string
  default     = ""
}
