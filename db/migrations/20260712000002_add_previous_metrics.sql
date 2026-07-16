-- Phase B: 前回観測時の数値を保持し、変化検出に使う
ALTER TABLE staff_analyses
  ADD COLUMN previous_metrics JSON NULL AFTER narratives,
  ADD COLUMN previous_generated_at DATETIME NULL AFTER previous_metrics;
