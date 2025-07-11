FROM node:18-alpine

# 作業ディレクトリを設定
WORKDIR /app

# パッケージ.jsonをコピーして依存関係をインストール
COPY package.json package-lock.json ./
RUN npm ci

# ソースコードをコピー
COPY . ./

# テレメトリを無効化
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=development

# 開発モードで実行
CMD ["npm", "run", "dev"] 