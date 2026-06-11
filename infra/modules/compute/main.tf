# ─── ECR ─────────────────────────────────────────────────────────
resource "aws_ecr_repository" "loop_backend" {
  name                 = "cygnus-loop-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration { scan_on_push = true }
}

# ─── ECS クラスタ ─────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "cygnus"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ─── IAM ──────────────────────────────────────────────────────────
resource "aws_iam_role" "ecs_task_execution" {
  name = "cygnus-ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ─── CloudWatch Logs ──────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "loop_backend" {
  name              = "/ecs/cygnus-loop-backend"
  retention_in_days = 30
}

# ─── タスク定義 ───────────────────────────────────────────────────
resource "aws_ecs_task_definition" "loop_backend" {
  family                   = "cygnus-loop-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name  = "loop-backend"
    image = var.app_image

    portMappings = [{
      containerPort = 8080
      protocol      = "tcp"
    }]

    environment = [
      { name = "PORT",           value = "8080" },
      { name = "DB_HOST",        value = var.db_endpoint },
      { name = "DB_PORT",        value = "3306" },
      { name = "DB_NAME",        value = "cygnus_dev" },
      { name = "DB_USER",        value = "cygnus" },
      { name = "ORDERS_BUCKET",  value = "cygnus-loop-orders" },
      { name = "ORDERS_REGION",  value = "ap-northeast-1" },
      { name = "SES_FROM",       value = var.ses_from },
    ]

    secrets = [
      { name = "DB_PASSWORD",  valueFrom = aws_ssm_parameter.db_password.arn },
      { name = "JWT_SECRET",   valueFrom = aws_ssm_parameter.jwt_secret.arn },
      { name = "ADMIN_TOKEN",  valueFrom = aws_ssm_parameter.admin_token.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.loop_backend.name
        "awslogs-region"        = "ap-northeast-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ─── SSM Parameter Store（シークレット）─────────────────────────
resource "aws_ssm_parameter" "db_password" {
  name  = "/cygnus/db_password"
  type  = "SecureString"
  value = var.db_password
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/cygnus/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret
}

resource "aws_ssm_parameter" "admin_token" {
  name  = "/cygnus/admin_token"
  type  = "SecureString"
  value = var.admin_token
}

resource "aws_iam_role_policy" "ecs_ssm" {
  name = "cygnus-ecs-ssm"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = [
        aws_ssm_parameter.db_password.arn,
        aws_ssm_parameter.jwt_secret.arn,
        aws_ssm_parameter.admin_token.arn,
      ]
    }]
  })
}

# ─── ECS タスクロール（アプリがAWS APIを呼ぶための権限）────────────
resource "aws_iam_role" "ecs_task" {
  name = "cygnus-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ecs_task_ce" {
  name = "cygnus-ecs-cost-explorer"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["ce:GetCostAndUsage"]
      Resource = ["*"]
    }]
  })
}

# ─── 発注書PDFバケット ─────────────────────────────────────────────
resource "aws_s3_bucket" "orders" {
  bucket = "cygnus-loop-orders"
}

resource "aws_s3_bucket_public_access_block" "orders" {
  bucket                  = aws_s3_bucket.orders.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "orders" {
  bucket = aws_s3_bucket.orders.id
  rule {
    id     = "expire-old-pdfs"
    status = "Enabled"
    filter {}
    expiration { days = 90 }
  }
}

# ─── ECS タスクロールに S3 / SES 権限を付与 ─────────────────────────
resource "aws_iam_role_policy" "ecs_task_orders" {
  name = "cygnus-ecs-orders"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.orders.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GeneratePresignedUrl"]
        Resource = ["${aws_s3_bucket.orders.arn}/*"]
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = ["*"]
      }
    ]
  })
}

# ─── セキュリティグループ ─────────────────────────────────────────
resource "aws_security_group" "alb" {
  name   = "cygnus-alb-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ecs" {
  name   = "cygnus-ecs-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ─── ALB ─────────────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "cygnus-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

resource "aws_lb_target_group" "loop_backend" {
  name        = "cygnus-loop-backend"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.acm_cert_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.loop_backend.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# ─── ECS サービス ─────────────────────────────────────────────────
resource "aws_ecs_service" "loop_backend" {
  name            = "cygnus-loop-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.loop_backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.public_subnet_ids
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.loop_backend.arn
    container_name   = "loop-backend"
    container_port   = 8080
  }

  depends_on = [aws_lb_listener.https]
}

# ─── Route 53 api.cygnus.style ────────────────────────────────────
data "aws_route53_zone" "main" {
  name         = var.domain
  private_zone = false
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# ─── outputs ─────────────────────────────────────────────────────
output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  value = aws_ecr_repository.loop_backend.repository_url
}
