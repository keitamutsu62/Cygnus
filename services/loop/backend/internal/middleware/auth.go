package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/labstack/echo/v4"
)

type Claims struct {
	StaffID         uint64  `json:"staff_id"`
	CygnusAccountID *uint64 `json:"cygnus_account_id,omitempty"`
	SalonID         uint64  `json:"salon_id"`
	SalonName       string  `json:"salon_name"`
	StoreID         *uint64 `json:"store_id,omitempty"`
	Role            string  `json:"role"`
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

			salonName, _ := mc["salon_name"].(string)
			claims := &Claims{
				StaffID:   uint64(mc["staff_id"].(float64)),
				SalonID:   uint64(mc["salon_id"].(float64)),
				SalonName: salonName,
				Role:      mc["role"].(string),
			}
			if v, ok := mc["cygnus_account_id"]; ok && v != nil {
				id := uint64(v.(float64))
				claims.CygnusAccountID = &id
			}
			if v, ok := mc["store_id"]; ok && v != nil {
				id := uint64(v.(float64))
				claims.StoreID = &id
			}
			c.Set(claimsKey, claims)
			return next(c)
		}
	}
}

func GetClaims(c echo.Context) *Claims {
	v, _ := c.Get(claimsKey).(*Claims)
	return v
}
