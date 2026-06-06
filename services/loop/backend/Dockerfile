FROM golang:1.25-alpine AS builder

# go.mod の replace: ../../../pkg/auth に合わせてディレクトリ構造を再現
WORKDIR /build/services/loop/backend
COPY services/loop/backend/go.mod services/loop/backend/go.sum ./
COPY pkg/ /build/pkg/
RUN GOWORK=off go mod download

COPY services/loop/backend/ .

RUN GOWORK=off go build -o /server ./cmd/server

FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata curl && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
    curl -sSf https://atlasgo.sh | sh && \
    rm -rf /var/cache/apk/*

COPY --from=builder /server /server
COPY services/loop/backend/entrypoint.sh /entrypoint.sh
COPY db/migrations /migrations

RUN chmod +x /entrypoint.sh

EXPOSE 8080

ENTRYPOINT ["/entrypoint.sh"]
