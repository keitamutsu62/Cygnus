package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
	"github.com/keitamutsu62/cygnus/pkg/auth/model"
)

const claimsKey = "claims"

func JWT(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			header := c.Request().Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")

			token, err := jwt.ParseWithClaims(tokenStr, &jwtClaims{}, func(t *jwt.Token) (any, error) {
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
			}

			jc := token.Claims.(*jwtClaims)
			c.Set(claimsKey, &model.Claims{
				AccountID: jc.AccountID,
				SalonID:   jc.SalonID,
				Role:      jc.Role,
			})
			return next(c)
		}
	}
}

func ClaimsFrom(c echo.Context) *model.Claims {
	v, _ := c.Get(claimsKey).(*model.Claims)
	return v
}

type jwtClaims struct {
	AccountID uint64     `json:"account_id"`
	SalonID   uint64     `json:"salon_id"`
	Role      model.Role `json:"role"`
	jwt.RegisteredClaims
}
