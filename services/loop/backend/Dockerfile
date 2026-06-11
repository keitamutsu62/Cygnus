FROM golang:1.25-alpine AS builder

# go.mod の replace: ../../../pkg/auth に合わせてディレクトリ構造を再現
WORKDIR /build/services/loop/backend
COPY services/loop/backend/go.mod services/loop/backend/go.sum ./
COPY pkg/ /build/pkg/
RUN GOWORK=off go mod download

COPY services/loop/backend/ .

RUN GOWORK=off go build -o /server ./cmd/server && \
    GOWORK=off go build -o /seed_demo ./cmd/seed_demo && \
    GOWORK=off go build -o /set_owner_id ./cmd/set_owner_id && \
    GOWORK=off go build -o /reset_owner_pw ./cmd/reset_owner_pw && \
    GOWORK=off go build -o /seed_works ./cmd/seed_works && \
    GOWORK=off go build -o /seed_salon1 ./cmd/seed_salon1 && \
    GOWORK=off go build -o /recalc_today ./cmd/recalc_today && \
    GOWORK=off go build -o /recalc_sales ./cmd/recalc_sales

FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata curl && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    curl -sSf https://atlasgo.sh | sh && \
    rm -rf /var/cache/apk/*

COPY --from=builder /server /server
COPY --from=builder /seed_demo /seed_demo
COPY --from=builder /set_owner_id /set_owner_id
COPY --from=builder /reset_owner_pw /reset_owner_pw
COPY --from=builder /seed_works /seed_works
COPY --from=builder /seed_salon1 /seed_salon1
COPY --from=builder /recalc_today /recalc_today
COPY --from=builder /recalc_sales /recalc_sales
COPY services/loop/backend/entrypoint.sh /entrypoint.sh
COPY db/migrations /migrations
RUN atlas migrate hash --dir "file:///migrations"

RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
