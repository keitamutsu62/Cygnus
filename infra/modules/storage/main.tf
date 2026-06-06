# ─── LOOP フロントエンド ─────────────────────────────────────────
resource "aws_s3_bucket" "loop" {
  bucket = "cygnus-loop-frontend"
}

resource "aws_s3_bucket_public_access_block" "loop" {
  bucket                  = aws_s3_bucket.loop.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "loop" {
  name                              = "cygnus-loop-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "loop" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = ["loop.${var.domain}"]

  origin {
    domain_name              = aws_s3_bucket.loop.bucket_regional_domain_name
    origin_id                = "s3-loop"
    origin_access_control_id = aws_cloudfront_origin_access_control.loop.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-loop"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # SPA: 404 → index.html にフォールバック
  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ─── STUDIO フロントエンド ────────────────────────────────────────
resource "aws_s3_bucket" "studio" {
  bucket = "cygnus-studio-frontend"
}

resource "aws_s3_bucket_public_access_block" "studio" {
  bucket                  = aws_s3_bucket.studio.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_cloudfront_origin_access_control" "studio" {
  name                              = "cygnus-studio-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "studio" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = ["studio.${var.domain}"]

  origin {
    domain_name              = aws_s3_bucket.studio.bucket_regional_domain_name
    origin_id                = "s3-studio"
    origin_access_control_id = aws_cloudfront_origin_access_control.studio.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-studio"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }

  viewer_certificate {
    acm_certificate_arn      = var.acm_cert_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# ─── Route 53 レコード ───────────────────────────────────────────
resource "aws_route53_record" "loop" {
  zone_id = var.route53_zone_id
  name    = "loop.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.loop.domain_name
    zone_id                = aws_cloudfront_distribution.loop.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "studio" {
  zone_id = var.route53_zone_id
  name    = "studio.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.studio.domain_name
    zone_id                = aws_cloudfront_distribution.studio.hosted_zone_id
    evaluate_target_health = false
  }
}
