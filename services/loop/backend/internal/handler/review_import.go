package handler

import (
	"io"
	"log"
	"net/http"
	"time"

	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/usecase"
	"github.com/labstack/echo/v4"
)

type ReviewImportHandler struct {
	uc *usecase.ReviewImportUsecase
}

func NewReviewImportHandler(uc *usecase.ReviewImportUsecase) *ReviewImportHandler {
	return &ReviewImportHandler{uc: uc}
}

// POST /api/v1/reviews/import/analyze
// multipart/form-data (field: images[])
func (h *ReviewImportHandler) Analyze(c echo.Context) error {
	claims := claimsFrom(c)
	form, err := c.MultipartForm()
	if err != nil {
		log.Printf("[reviews.import.analyze] salon_id=%d multipart parse err=%v content_length=%d content_type=%q",
			claims.SalonID, err, c.Request().ContentLength, c.Request().Header.Get("Content-Type"))
		return echo.NewHTTPError(http.StatusBadRequest, "multipart parse failed")
	}
	files := form.File["images"]
	if len(files) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "no images uploaded")
	}
	if len(files) > 20 {
		return echo.NewHTTPError(http.StatusBadRequest, "too many images (max 20)")
	}

	images := make([]usecase.ImportImage, 0, len(files))
	for _, fh := range files {
		f, err := fh.Open()
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "cannot read file")
		}
		data, err := io.ReadAll(f)
		f.Close()
		if err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "cannot read file body")
		}
		mediaType := fh.Header.Get("Content-Type")
		if mediaType == "" {
			mediaType = "image/png"
		}
		images = append(images, usecase.ImportImage{Data: data, MediaType: mediaType})
	}

	extracted, err := h.uc.Analyze(c.Request().Context(), claims.SalonID, images)
	if err != nil {
		log.Printf("[reviews.import.analyze] salon_id=%d err=%v", claims.SalonID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "analyze failed")
	}
	return c.JSON(http.StatusOK, extracted)
}

// POST /api/v1/reviews/import
func (h *ReviewImportHandler) BulkSave(c echo.Context) error {
	claims := claimsFrom(c)
	var req struct {
		StoreID *uint64 `json:"store_id"`
		Items   []struct {
			StaffID       *uint64 `json:"staff_id"`
			MenuID        *uint64 `json:"menu_id"`
			RatingOverall uint8   `json:"rating_overall"`
			RatingFinish  uint8   `json:"rating_finish"`
			RatingService uint8   `json:"rating_service"`
			Comment       string  `json:"comment"`
			CreatedAt     string  `json:"created_at"` // YYYY-MM-DD
		} `json:"items"`
	}
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid request")
	}
	if len(req.Items) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "items is empty")
	}

	inputs := make([]usecase.SaveReviewInput, 0, len(req.Items))
	for _, it := range req.Items {
		var comment *string
		if it.Comment != "" {
			c := it.Comment
			comment = &c
		}
		var createdAt *time.Time
		if it.CreatedAt != "" {
			if t, err := time.Parse("2006-01-02", it.CreatedAt); err == nil {
				createdAt = &t
			}
		}
		inputs = append(inputs, usecase.SaveReviewInput{
			StaffID:       it.StaffID,
			MenuID:        it.MenuID,
			RatingOverall: it.RatingOverall,
			RatingFinish:  it.RatingFinish,
			RatingService: it.RatingService,
			Comment:       comment,
			CreatedAt:     createdAt,
		})
	}

	saved, err := h.uc.BulkSave(c.Request().Context(), claims.SalonID, req.StoreID, inputs)
	if err != nil {
		log.Printf("[reviews.import.save] salon_id=%d err=%v", claims.SalonID, err)
		return echo.NewHTTPError(http.StatusInternalServerError, "save failed")
	}
	return c.JSON(http.StatusOK, map[string]int{"saved": saved})
}
