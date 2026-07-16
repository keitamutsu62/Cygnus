package mysql

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jmoiron/sqlx"
	"github.com/keitamutsu62/cygnus/services/loop/backend/internal/domain/model"
	"github.com/keitamutsu62/cygnus/services/loop/backend/pkg/apierror"
)

type StaffAnalysisRepository struct{ db *sqlx.DB }

func NewStaffAnalysisRepository(db *sqlx.DB) *StaffAnalysisRepository {
	return &StaffAnalysisRepository{db: db}
}

type staffAnalysisRow struct {
	ID                  uint64         `db:"id"`
	StaffID             uint64         `db:"staff_id"`
	Metrics             []byte         `db:"metrics"`
	CommentElements     []byte         `db:"comment_elements"`
	Narratives          []byte         `db:"narratives"`
	Observations        sql.NullString `db:"observations"`
	PreviousMetrics     sql.NullString `db:"previous_metrics"`
	PreviousGeneratedAt sql.NullTime   `db:"previous_generated_at"`
	ReviewCount         uint32         `db:"review_count"`
	GeneratedAt         time.Time      `db:"generated_at"`
}

func (r *StaffAnalysisRepository) FindByStaffID(ctx context.Context, staffID uint64) (*model.StaffAnalysis, error) {
	var row staffAnalysisRow
	err := r.db.GetContext(ctx, &row,
		`SELECT id, staff_id, metrics, comment_elements, narratives, observations, previous_metrics, previous_generated_at, review_count, generated_at
		 FROM staff_analyses WHERE staff_id = ?`, staffID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	a := &model.StaffAnalysis{
		ID:          row.ID,
		StaffID:     row.StaffID,
		ReviewCount: row.ReviewCount,
		GeneratedAt: row.GeneratedAt,
	}
	if err := json.Unmarshal(row.Metrics, &a.Metrics); err != nil {
		return nil, fmt.Errorf("decode metrics: %w", err)
	}
	if err := json.Unmarshal(row.CommentElements, &a.CommentElements); err != nil {
		return nil, fmt.Errorf("decode comment_elements: %w", err)
	}
	if err := json.Unmarshal(row.Narratives, &a.Narratives); err != nil {
		return nil, fmt.Errorf("decode narratives: %w", err)
	}
	if row.Observations.Valid && row.Observations.String != "" {
		if err := json.Unmarshal([]byte(row.Observations.String), &a.Observations); err != nil {
			return nil, fmt.Errorf("decode observations: %w", err)
		}
	} else {
		a.Observations = []model.Observation{}
	}
	if row.PreviousMetrics.Valid && row.PreviousMetrics.String != "" {
		var pm model.StaffMetrics
		if err := json.Unmarshal([]byte(row.PreviousMetrics.String), &pm); err == nil {
			a.PreviousMetrics = &pm
		}
	}
	if row.PreviousGeneratedAt.Valid {
		t := row.PreviousGeneratedAt.Time
		a.PreviousGeneratedAt = &t
	}
	return a, nil
}

// Upsert — 新しい観測結果を保存。previous_* は Usecase で埋めた値をそのまま保存。
func (r *StaffAnalysisRepository) Upsert(ctx context.Context, a *model.StaffAnalysis) error {
	metrics, _ := json.Marshal(a.Metrics)
	elements, _ := json.Marshal(a.CommentElements)
	narr, _ := json.Marshal(a.Narratives)
	observations, _ := json.Marshal(a.Observations)

	var prevMetrics []byte
	if a.PreviousMetrics != nil {
		prevMetrics, _ = json.Marshal(a.PreviousMetrics)
	}
	var prevGeneratedAt any
	if a.PreviousGeneratedAt != nil {
		prevGeneratedAt = *a.PreviousGeneratedAt
	}

	now := time.Now()
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO staff_analyses
		   (staff_id, metrics, comment_elements, narratives, observations, previous_metrics, previous_generated_at, review_count, generated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		 ON DUPLICATE KEY UPDATE
		   metrics               = VALUES(metrics),
		   comment_elements      = VALUES(comment_elements),
		   narratives            = VALUES(narratives),
		   observations          = VALUES(observations),
		   previous_metrics      = VALUES(previous_metrics),
		   previous_generated_at = VALUES(previous_generated_at),
		   review_count          = VALUES(review_count),
		   generated_at          = VALUES(generated_at)`,
		a.StaffID, metrics, elements, narr, observations, prevMetrics, prevGeneratedAt, a.ReviewCount, now)
	if err != nil {
		return fmt.Errorf("StaffAnalysisRepository.Upsert: %w", err)
	}
	return nil
}
