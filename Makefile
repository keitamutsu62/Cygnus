.PHONY: s build test migrate lint clean

# ── 起動 ──────────────────────────────────────────────
s:
	docker compose up -d
	@echo "MySQL: localhost:3306 / Redis: localhost:6379"
	@echo "Run 'make loop' or 'make reserve' to start backends"

stop:
	docker compose down

# ── サービス別 ────────────────────────────────────────
loop:
	cd services/loop/backend && go run ./cmd/server

reserve:
	cd services/reserve/backend && go run ./cmd/server

loop-ui:
	cd services/loop/frontend && npm run dev

reserve-ui:
	cd services/reserve/frontend && npm run dev

# ── ビルド ────────────────────────────────────────────
build:
	cd services/loop/backend    && go build ./...
	cd services/reserve/backend && go build ./...
	cd pkg/auth                 && go build ./...
	npm run build

# ── テスト ────────────────────────────────────────────
test:
	go test ./...

test-loop:
	cd services/loop/backend && go test ./...

test-reserve:
	cd services/reserve/backend && go test ./...

# ── マイグレーション ─────────────────────────────────
migrate:
	atlas schema apply --env dev

migrate-dry:
	atlas schema apply --env dev --dry-run

# ── Lint ─────────────────────────────────────────────
lint:
	go vet ./...
	npm run lint

# ── クリーン ──────────────────────────────────────────
clean:
	docker compose down -v
	find . -name "*.out" -delete
