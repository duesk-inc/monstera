// Jest環境変数セットアップ

// Cognito認証テスト用の環境変数
process.env.NEXT_PUBLIC_AUTH_SERVICE = 'cognito';
process.env.NEXT_PUBLIC_COGNITO_REGION = 'us-east-1';
process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID = 'local_7221v1tw';
process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = '62h69i1tpbn9rmh83xmtjyj4b';
process.env.NEXT_PUBLIC_COGNITO_ENDPOINT = 'http://localhost:9230';

// API_URLの設定
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';

// その他の必要な環境変数
process.env.NODE_ENV = 'test';
