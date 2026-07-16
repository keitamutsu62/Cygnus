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

type StoreAnalysisRepository struct{ db *sqlx.DB }

func NewStoreAnalysisRepository(db *sqlx.DB) *StoreAnalysisRepository {
	return &StoreAnalysisRepository{db: db}
}

type storeAnalysisRow struct {
	ID                  uint64         `db:"id"`
	StoreID             uint64         `db:"store_id"`
	Metrics             []byte         `db:"metrics"`
	CommentElements     []byte         `db:"comment_elements"`
	Narratives          []byte         `db:"narratives"`
	Observations        sql.NullString `db:"observations"`
	PreviousMetrics     sql.NullString `db:"previous_metrics"`
	PreviousGeneratedAt sql.NullTime   `db:"previous_generated_at"`
	ReviewCount         uint32         `db:"review_count"`
	GeneratedAt         time.Time      `db:"generated_at"`
}

func (r *StoreAnalysisRepository) FindByStoreID(ctx context.Context, storeID uint64) (*model.StoreAnalysis, error) {
	var row storeAnalysisRow
	err := r.db.GetContext(ctx, &row,
		`SELECT id, store_id, metrics, comment_elements, narratives, observations, previous_metrics, previous_generated_at, review_count, generated_at
		 FROM store_analyses WHERE store_id = ?`, storeID)
	if err != nil {
		return nil, apierror.ErrNotFound
	}
	a := &model.StoreAnalysis{
		ID:          row.ID,
		StoreID:     row.StoreID,
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
		var pm model.StoreMetrics
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

func (r *StoreAnalysisRepository) Upsert(ctx context.Context, a *model.StoreAnalysis) error {
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
		`INSERT INTO store_analyses
		   (store_id, metrics, comment_elements, narratives, observations, previous_metrics, previous_generated_at, review_count, generated_at)
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
		a.StoreID, metrics, elements, narr, observations, prevMetrics, prevGeneratedAt, a.ReviewCount, now)
	if err != nil {
		return fmt.Errorf("StoreAnalysisRepository.Upsert: %w", err)
	}
	return nil
}
