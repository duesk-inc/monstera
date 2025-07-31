/**
 * 技術カテゴリーと技術リストのマスターデータ
 */

export const TECHNOLOGY_CATEGORIES = {
  PROGRAMMING_LANGUAGES: 'programming_languages',
  SERVERS_DATABASES: 'servers_databases',
  TOOLS: 'tools',
} as const;

export const TECHNOLOGY_OPTIONS = {
  // プログラミング言語
  [TECHNOLOGY_CATEGORIES.PROGRAMMING_LANGUAGES]: [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'Ruby', 'PHP', 'Go',
    'Swift', 'Kotlin', 'Rust', 'C++', 'Scala', 'R', 'MATLAB', 'Perl',
    'Objective-C', 'Dart', 'Elixir', 'Clojure', 'Haskell', 'Lua', 'Julia',
    'F#', 'Erlang', 'Crystal', 'Nim', 'OCaml', 'Zig', 'V'
  ],
  
  // サーバー・データベース
  [TECHNOLOGY_CATEGORIES.SERVERS_DATABASES]: [
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'DynamoDB', 'SQLite',
    'Oracle', 'SQL Server', 'Cassandra', 'Elasticsearch', 'Neo4j',
    'CouchDB', 'Firebase', 'MariaDB', 'Memcached', 'RethinkDB',
    'ArangoDB', 'InfluxDB', 'Apache', 'Nginx', 'IIS', 'Tomcat',
    'Node.js', 'Deno', 'Bun'
  ],
  
  // ツール・フレームワーク
  [TECHNOLOGY_CATEGORIES.TOOLS]: [
    'React', 'Angular', 'Vue.js', 'Next.js', 'Nuxt.js', 'Express',
    'Django', 'Flask', 'Ruby on Rails', 'Laravel', 'Spring', 'ASP.NET',
    'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI', 'GitHub Actions',
    'Terraform', 'Ansible', 'Webpack', 'Vite', 'Babel', 'ESLint',
    'Prettier', 'Jest', 'Cypress', 'Selenium', 'Postman', 'Swagger',
    'GraphQL', 'REST API', 'gRPC', 'WebSocket', 'OAuth', 'AWS Cognito'
  ],
} as const;

// すべての技術オプションをフラットな配列として取得
export const ALL_TECHNOLOGY_OPTIONS = Object.values(TECHNOLOGY_OPTIONS).flat();

// カテゴリー表示名
export const TECHNOLOGY_CATEGORY_NAMES: Record<string, string> = {
  [TECHNOLOGY_CATEGORIES.PROGRAMMING_LANGUAGES]: 'プログラミング言語',
  [TECHNOLOGY_CATEGORIES.SERVERS_DATABASES]: 'サーバー・データベース',
  [TECHNOLOGY_CATEGORIES.TOOLS]: 'ツール・フレームワーク',
} as const;