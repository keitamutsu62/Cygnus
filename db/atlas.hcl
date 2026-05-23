env "dev" {
  src = "file://db/schema"
  url = "mysql://cygnus:cygnus@localhost:3306/cygnus_dev"
  dev = "docker://mysql/8.4/dev"

  migration {
    dir    = "file://db/migrations"
    format = atlas
  }
}

env "prod" {
  src = "file://db/schema"
  url = getenv("DATABASE_URL")

  migration {
    dir    = "file://db/migrations"
    format = atlas
  }
}
