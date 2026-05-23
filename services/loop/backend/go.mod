module github.com/keitamutsu62/cygnus/services/loop/backend

go 1.25

require (
	github.com/keitamutsu62/cygnus/pkg/auth v0.0.0
	github.com/labstack/echo/v4 v4.13.3
	github.com/jmoiron/sqlx v1.4.0
	github.com/go-sql-driver/mysql v1.8.1
	github.com/redis/go-redis/v9 v9.7.0
)

replace github.com/keitamutsu62/cygnus/pkg/auth => ../../../pkg/auth
