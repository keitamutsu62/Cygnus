variable "url" {
  type    = string
  default = getenv("DATABASE_URL")
}

env "dev" {
  src = "file://db/schema"
  url = "mysql://cygnus:cygnus@localhost:3306/cygnus_dev"
  dev = "docker://mysql/8.4/cygnus_dev"

  migration {
    dir = "file://db/migrations"
  }
}

env "prod" {
  src = "file://db/schema"
  url = var.url

  migration {
    dir = "file://db/migrations"
  }
}
