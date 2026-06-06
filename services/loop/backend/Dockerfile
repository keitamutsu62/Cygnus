FROM golang:1.25-alpine AS builder

# go.mod の replace: ../../../pkg/auth に合わせてディレクトリ構造を再現
WORKDIR /build/services/loop/backend
COPY services/loop/backend/go.mod services/loop/backend/go.sum ./
COPY pkg/ /build/pkg/
RUN GOWORK=off go mod download

COPY services/loop/backend/ .

RUN GOWORK=off go build -o /server ./cmd/server

FROM alpine:3.20

RUN apk --no-cache add ca-certificates tzdata && \
    cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime

COPY --from=builder /server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
