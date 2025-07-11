FROM golang:1.23-bullseye AS builder

# 必要なパッケージをインストール (Debian系)
RUN apt-get update && apt-get install -y --no-install-recommends \
	git \
	gcc \
	libc6-dev \
	postgresql-client \
	&& rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# ビルドオプションの設定
ENV GOTOOLCHAIN=local
# ENV CGO_ENABLED=1 # CGOを無効にするためコメントアウトまたは削除

# ソースコードをコピー
COPY . .

# go.modはそのまま使用（Go 1.23に統一）

# アプリケーションをビルド (ターゲットアーキテクチャを明示的に指定)
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -a -ldflags '-s -w' -tags netgo,osusergo -o /app/monstera-api ./cmd/server

# 実行用のイメージを作成 (Debian Bullseyeフルベース)
FROM debian:bullseye AS final

ARG MIGRATE_VERSION=v4.17.1

# 必要なランタイム依存関係をインストール (Debian系)
# Chrome headless用の依存関係を追加
RUN apt-get update && apt-get install -y --no-install-recommends \
	ca-certificates tzdata postgresql-client netcat-traditional curl \
	wget gnupg \
	fonts-noto-cjk fonts-noto-cjk-extra \
	libx11-6 libx11-xcb1 libxcb1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
	libxi6 libxrandr2 libxrender1 libxtst6 libnss3 libatk1.0-0 libdrm2 \
	libxcomposite1 libxss1 libasound2 libatspi2.0-0 libgtk-3-0 libgbm1 \
	&& rm -rf /var/lib/apt/lists/*

# Chromiumをインストール (ARM64対応)
RUN apt-get update \
	&& apt-get install -y --no-install-recommends chromium \
	&& rm -rf /var/lib/apt/lists/*

# golang-migrateをインストール
RUN curl -L https://github.com/golang-migrate/migrate/releases/download/${MIGRATE_VERSION}/migrate.linux-amd64.tar.gz | tar xvz && \
	mv migrate /usr/local/bin/migrate && \
	chmod +x /usr/local/bin/migrate

ENV TZ=Asia/Tokyo
WORKDIR /app

# ビルダーステージからバイナリを /usr/local/bin にコピー
COPY --from=builder /app/monstera-api /usr/local/bin/monstera-api
RUN echo "DEBUG (final): After COPY monstera-api to /usr/local/bin:" && ls -la /usr/local/bin && ls -la /app
RUN chmod +x /usr/local/bin/monstera-api
RUN echo "DEBUG (final): After chmod /usr/local/bin/monstera-api:" && ls -la /usr/local/bin && ls -la /app

# .env ファイルはコピーせず、環境変数を使用する
# COPY .env .
COPY wait-for-postgres.sh .
RUN chmod +x ./wait-for-postgres.sh # /app/wait-for-postgres.sh
RUN echo "DEBUG (final): After chmod wait-for-postgres.sh:" && ls -la /app

# ユーザーを作成して権限を設定 (Debian系)
RUN adduser --system --group appuser --no-create-home --shell /bin/false --disabled-password
# /app ディレクトリの所有者は appuser にする (entrypoint.sh や .envのため)
RUN chown -R appuser:appuser /app
# /usr/local/bin/monstera-api の所有者も appuser にする
RUN chown appuser:appuser /usr/local/bin/monstera-api
RUN echo "DEBUG (final): After chown operations:" && ls -la /usr/local/bin && ls -la /app
USER appuser

# CMD は entrypoint.sh で上書きされるので、ここでは参考程度
CMD ["/usr/local/bin/monstera-api"] 