package apierror

import "errors"

var (
	ErrNotFound         = errors.New("not found")
	ErrConflict         = errors.New("conflict")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrStaffLimitExceed = errors.New("staff limit exceeded")
	ErrInvalidToken     = errors.New("invalid or expired token")
)
