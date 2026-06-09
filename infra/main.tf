module "dns" {
  source = "./modules/dns"
  domain = var.domain
}

module "cert" {
  source          = "./modules/cert"
  domain          = var.domain
  route53_zone_id = module.dns.zone_id

  providers = {
    aws.us_east_1 = aws.us_east_1
  }
}

module "database" {
  source      = "./modules/database"
  db_password = var.db_password
}

module "storage" {
  source          = "./modules/storage"
  domain          = var.domain
  acm_cert_arn    = module.cert.cloudfront_cert_arn
  route53_zone_id = module.dns.zone_id
}

module "compute" {
  source             = "./modules/compute"
  domain             = var.domain
  acm_cert_arn       = module.cert.regional_cert_arn
  vpc_id             = module.database.vpc_id
  public_subnet_ids  = module.database.public_subnet_ids
  private_subnet_ids = module.database.private_subnet_ids
  db_endpoint        = module.database.endpoint
  db_password        = var.db_password
  jwt_secret         = var.jwt_secret
  admin_token        = var.admin_token
}
