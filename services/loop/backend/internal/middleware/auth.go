package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type Claims struct {
	StaffID uint64 `json:"staff_id"`
	SalonID uint64 `json:"salon_id"`
	Role    string `json:"role"`
}

const claimsKey = "claims"

func JWT(secret string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			header := c.Request().Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				return echo.NewHTTPError(http.StatusUnauthorized, "missing token")
			}
			tokenStr := strings.TrimPrefix(header, "Bearer ")

			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, echo.NewHTTPError(http.StatusUnauthorized, "unexpected signing method")
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
			}

			mc, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid claims")
			}

			c.Set(claimsKey, &Claims{
				StaffID: uint64(mc["staff_id"].(float64)),
				SalonID: uint64(mc["salon_id"].(float64)),
				Role:    mc["role"].(string),
			})
			return next(c)
		}
	}
}

func GetClaims(c echo.Context) *Claims {
	v, _ := c.Get(claimsKey).(*Claims)
	return v
}
