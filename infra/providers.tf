terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "cygnus-tfstate"
    key            = "cygnus/terraform.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "cygnus-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM は CloudFront 用に us-east-1 でも発行が必要
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}
