# Build stage
FROM golang:1.23-alpine AS builder

# 必要なツールをインストール
RUN apk add --no-cache git ca-certificates tzdata

# 作業ディレクトリを設定
WORKDIR /app

# Go modulesファイルをコピー
COPY go.mod go.sum ./

# 依存関係をダウンロード
RUN go mod download

# ソースコードをコピー
COPY . .

# バッチアプリケーションをビルド
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o batch ./cmd/batch/main.go

# Production stage
FROM alpine:latest

# 必要なパッケージをインストール
RUN apk --no-cache add ca-certificates tzdata

# タイムゾーンを東京に設定
ENV TZ=Asia/Tokyo

# 非rootユーザーを作成
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 作業ディレクトリを設定
WORKDIR /app

# ビルドされたバイナリをコピー
COPY --from=builder /app/batch .

# 設定ファイルをコピー（必要に応じて）
COPY --from=builder /app/.env.example .env.example

# バイナリに実行権限を付与
RUN chmod +x batch

# 所有権をappuserに変更
RUN chown -R appuser:appgroup /app

# 非rootユーザーに切り替え
USER appuser

# ヘルスチェック用のスクリプト
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ps aux | grep -v grep | grep batch || exit 1

# バッチアプリケーションを実行
CMD ["./batch"]