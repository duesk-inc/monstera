package normalizer

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalize(t *testing.T) {
	normalizer := NewTechnologyNormalizer()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// Java関連
		{
			name:     "java小文字",
			input:    "java",
			expected: "Java",
		},
		{
			name:     "java大文字",
			input:    "JAVA",
			expected: "Java",
		},
		{
			name:     "java8",
			input:    "java8",
			expected: "Java",
		},
		{
			name:     "java11",
			input:    "java11",
			expected: "Java",
		},
		{
			name:     "OpenJDK",
			input:    "openjdk",
			expected: "Java",
		},

		// JavaScript関連
		{
			name:     "javascript",
			input:    "javascript",
			expected: "JavaScript",
		},
		{
			name:     "js",
			input:    "js",
			expected: "JavaScript",
		},
		{
			name:     "JS大文字",
			input:    "JS",
			expected: "JavaScript",
		},
		{
			name:     "es6",
			input:    "es6",
			expected: "JavaScript",
		},
		{
			name:     "nodejs",
			input:    "nodejs",
			expected: "Node.js",
		},
		{
			name:     "node.js",
			input:    "node.js",
			expected: "Node.js",
		},
		{
			name:     "node",
			input:    "node",
			expected: "Node.js",
		},

		// TypeScript関連
		{
			name:     "typescript",
			input:    "typescript",
			expected: "TypeScript",
		},
		{
			name:     "ts",
			input:    "ts",
			expected: "TypeScript",
		},
		{
			name:     "TS大文字",
			input:    "TS",
			expected: "TypeScript",
		},

		// Python関連
		{
			name:     "python",
			input:    "python",
			expected: "Python",
		},
		{
			name:     "python3",
			input:    "python3",
			expected: "Python",
		},
		{
			name:     "py",
			input:    "py",
			expected: "Python",
		},

		// C#関連
		{
			name:     "c#",
			input:    "c#",
			expected: "C#",
		},
		{
			name:     "csharp",
			input:    "csharp",
			expected: "C#",
		},
		{
			name:     "c-sharp",
			input:    "c-sharp",
			expected: "C#",
		},
		{
			name:     "cs",
			input:    "cs",
			expected: "C#",
		},
		{
			name:     "dotnet",
			input:    "dotnet",
			expected: ".NET",
		},
		{
			name:     ".net",
			input:    ".net",
			expected: ".NET",
		},
		{
			name:     ".net core",
			input:    ".net core",
			expected: ".NET Core",
		},

		// C/C++関連
		{
			name:     "c",
			input:    "c",
			expected: "C",
		},
		{
			name:     "c++",
			input:    "c++",
			expected: "C++",
		},
		{
			name:     "cpp",
			input:    "cpp",
			expected: "C++",
		},

		// PHP関連
		{
			name:     "php",
			input:    "php",
			expected: "PHP",
		},
		{
			name:     "php7",
			input:    "php7",
			expected: "PHP",
		},
		{
			name:     "php8",
			input:    "php8",
			expected: "PHP",
		},

		// Ruby関連
		{
			name:     "ruby",
			input:    "ruby",
			expected: "Ruby",
		},
		{
			name:     "ruby on rails",
			input:    "ruby on rails",
			expected: "Ruby on Rails",
		},
		{
			name:     "ror",
			input:    "ror",
			expected: "Ruby on Rails",
		},
		{
			name:     "rails",
			input:    "rails",
			expected: "Ruby on Rails",
		},

		// Go関連
		{
			name:     "go",
			input:    "go",
			expected: "Go",
		},
		{
			name:     "golang",
			input:    "golang",
			expected: "Go",
		},
		{
			name:     "Golang",
			input:    "Golang",
			expected: "Go",
		},

		// データベース関連
		{
			name:     "mysql",
			input:    "mysql",
			expected: "MySQL",
		},
		{
			name:     "mysql8",
			input:    "mysql8",
			expected: "MySQL",
		},
		{
			name:     "postgresql",
			input:    "postgresql",
			expected: "PostgreSQL",
		},
		{
			name:     "postgres",
			input:    "postgres",
			expected: "PostgreSQL",
		},
		{
			name:     "oracle",
			input:    "oracle",
			expected: "Oracle Database",
		},
		{
			name:     "mongodb",
			input:    "mongodb",
			expected: "MongoDB",
		},
		{
			name:     "mongo",
			input:    "mongo",
			expected: "MongoDB",
		},
		{
			name:     "redis",
			input:    "redis",
			expected: "Redis",
		},

		// フレームワーク関連
		{
			name:     "react",
			input:    "react",
			expected: "React",
		},
		{
			name:     "reactjs",
			input:    "reactjs",
			expected: "React",
		},
		{
			name:     "vue",
			input:    "vue",
			expected: "Vue.js",
		},
		{
			name:     "vuejs",
			input:    "vuejs",
			expected: "Vue.js",
		},
		{
			name:     "angular",
			input:    "angular",
			expected: "Angular",
		},
		{
			name:     "spring",
			input:    "spring",
			expected: "Spring Framework",
		},
		{
			name:     "spring boot",
			input:    "spring boot",
			expected: "Spring Boot",
		},
		{
			name:     "django",
			input:    "django",
			expected: "Django",
		},
		{
			name:     "flask",
			input:    "flask",
			expected: "Flask",
		},
		{
			name:     "express",
			input:    "express",
			expected: "Express.js",
		},
		{
			name:     "laravel",
			input:    "laravel",
			expected: "Laravel",
		},

		// ツール関連
		{
			name:     "git",
			input:    "git",
			expected: "Git",
		},
		{
			name:     "github",
			input:    "github",
			expected: "GitHub",
		},
		{
			name:     "docker",
			input:    "docker",
			expected: "Docker",
		},
		{
			name:     "kubernetes",
			input:    "kubernetes",
			expected: "Kubernetes",
		},
		{
			name:     "k8s",
			input:    "k8s",
			expected: "Kubernetes",
		},
		{
			name:     "jenkins",
			input:    "jenkins",
			expected: "Jenkins",
		},
		{
			name:     "vscode",
			input:    "vscode",
			expected: "Visual Studio Code",
		},
		{
			name:     "intellij",
			input:    "intellij",
			expected: "IntelliJ IDEA",
		},

		// AWS関連
		{
			name:     "aws",
			input:    "aws",
			expected: "AWS",
		},
		{
			name:     "ec2",
			input:    "ec2",
			expected: "Amazon EC2",
		},
		{
			name:     "s3",
			input:    "s3",
			expected: "Amazon S3",
		},
		{
			name:     "lambda",
			input:    "lambda",
			expected: "AWS Lambda",
		},

		// 未知の技術（最初の文字を大文字に）
		{
			name:     "未知の技術",
			input:    "unknown_tech",
			expected: "Unknown_tech",
		},
		{
			name:     "空文字",
			input:    "",
			expected: "",
		},
		{
			name:     "空白のみ",
			input:    "   ",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizer.Normalize(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestGetSuggestions(t *testing.T) {
	normalizer := NewTechnologyNormalizer()

	tests := []struct {
		name     string
		input    string
		limit    int
		expected []string
	}{
		{
			name:     "java前方一致",
			input:    "java",
			limit:    5,
			expected: []string{"Java", "JavaScript"},
		},
		{
			name:     "js前方一致",
			input:    "js",
			limit:    3,
			expected: []string{"JavaScript"},
		},
		{
			name:     "py前方一致",
			input:    "py",
			limit:    5,
			expected: []string{"Python"},
		},
		{
			name:     "sql部分一致",
			input:    "sql",
			limit:    5,
			expected: []string{"MySQL", "PostgreSQL", "SQL Server"},
		},
		{
			name:     "react前方一致",
			input:    "react",
			limit:    3,
			expected: []string{"React"},
		},
		{
			name:     "spring前方一致",
			input:    "spring",
			limit:    3,
			expected: []string{"Spring Framework", "Spring Boot"},
		},
		{
			name:     "空文字",
			input:    "",
			limit:    5,
			expected: []string{},
		},
		{
			name:     "limit0",
			input:    "java",
			limit:    0,
			expected: []string{},
		},
		{
			name:     "存在しない技術",
			input:    "xyz123",
			limit:    5,
			expected: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizer.GetSuggestions(tt.input, tt.limit)

			// 長さをチェック
			assert.LessOrEqual(t, len(result), tt.limit)

			// 期待される候補が含まれているかチェック
			for _, expected := range tt.expected {
				assert.Contains(t, result, expected)
			}
		})
	}
}

func TestIsKnownTechnology(t *testing.T) {
	normalizer := NewTechnologyNormalizer()

	tests := []struct {
		name     string
		input    string
		expected bool
	}{
		{
			name:     "java",
			input:    "java",
			expected: true,
		},
		{
			name:     "javascript",
			input:    "javascript",
			expected: true,
		},
		{
			name:     "python",
			input:    "python",
			expected: true,
		},
		{
			name:     "c#",
			input:    "c#",
			expected: true,
		},
		{
			name:     "unknown",
			input:    "unknown_tech",
			expected: false,
		},
		{
			name:     "空文字",
			input:    "",
			expected: false,
		},
		{
			name:     "大文字小文字混在",
			input:    "JavaScript",
			expected: true,
		},
		{
			name:     "バージョン付き",
			input:    "java8",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizer.IsKnownTechnology(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestAddCustomRule(t *testing.T) {
	normalizer := NewTechnologyNormalizer()

	// カスタムルールを追加
	normalizer.AddCustomRule("customtech", "Custom Technology")
	normalizer.AddCustomRule("myframework", "My Framework")

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "カスタム技術1",
			input:    "customtech",
			expected: "Custom Technology",
		},
		{
			name:     "カスタム技術2",
			input:    "myframework",
			expected: "My Framework",
		},
		{
			name:     "既存の技術",
			input:    "java",
			expected: "Java",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizer.Normalize(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestCapitalizeFirst(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "小文字",
			input:    "hello",
			expected: "Hello",
		},
		{
			name:     "大文字",
			input:    "HELLO",
			expected: "HELLO",
		},
		{
			name:     "混在",
			input:    "hELLO",
			expected: "HELLO",
		},
		{
			name:     "空文字",
			input:    "",
			expected: "",
		},
		{
			name:     "1文字",
			input:    "a",
			expected: "A",
		},
		{
			name:     "日本語",
			input:    "こんにちは",
			expected: "こんにちは",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := capitalizeFirst(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// 100パターン以上のテストケース
func TestNormalizeExtensive(t *testing.T) {
	normalizer := NewTechnologyNormalizer()

	// 100+ パターンのテストケース
	testCases := []struct {
		input    string
		expected string
	}{
		// プログラミング言語 (40パターン)
		{"java", "Java"}, {"JAVA", "Java"}, {"Java", "Java"}, {"java8", "Java"}, {"java11", "Java"},
		{"java17", "Java"}, {"java21", "Java"}, {"openjdk", "Java"}, {"jdk", "Jdk"}, {"jre", "Jre"},
		{"javascript", "JavaScript"}, {"js", "JavaScript"}, {"JS", "JavaScript"}, {"es6", "JavaScript"},
		{"es2015", "JavaScript"}, {"ecmascript", "JavaScript"}, {"nodejs", "Node.js"}, {"node", "Node.js"},
		{"typescript", "TypeScript"}, {"ts", "TypeScript"}, {"TS", "TypeScript"}, {"python", "Python"},
		{"python3", "Python"}, {"python2", "Python"}, {"py", "Python"}, {"c#", "C#"}, {"csharp", "C#"},
		{"c-sharp", "C#"}, {"cs", "C#"}, {"dotnet", ".NET"}, {".net", ".NET"}, {"dotnetcore", ".NET Core"},
		{".net core", ".NET Core"}, {"c", "C"}, {"c++", "C++"}, {"cpp", "C++"}, {"cplusplus", "C++"},
		{"php", "PHP"}, {"php7", "PHP"}, {"php8", "PHP"},

		// データベース・サーバー (30パターン)
		{"mysql", "MySQL"}, {"mysql5", "MySQL"}, {"mysql8", "MySQL"}, {"mariadb", "MariaDB"},
		{"postgresql", "PostgreSQL"}, {"postgres", "PostgreSQL"}, {"pgsql", "PostgreSQL"},
		{"oracle", "Oracle Database"}, {"oracle db", "Oracle Database"}, {"oracledb", "Oracle Database"},
		{"sqlserver", "SQL Server"}, {"sql server", "SQL Server"}, {"mssql", "SQL Server"},
		{"mongodb", "MongoDB"}, {"mongo", "MongoDB"}, {"redis", "Redis"}, {"elasticsearch", "Elasticsearch"},
		{"elastic", "Elasticsearch"}, {"apache", "Apache HTTP Server"}, {"httpd", "Apache HTTP Server"},
		{"apache2", "Apache HTTP Server"}, {"nginx", "Nginx"}, {"NGINX", "Nginx"}, {"docker", "Docker"},
		{"docker-compose", "Docker Compose"}, {"dockercompose", "Docker Compose"}, {"kubernetes", "Kubernetes"},
		{"k8s", "Kubernetes"}, {"kube", "Kubernetes"}, {"memcached", "Memcached"},

		// フレームワーク・ライブラリ (30パターン以上)
		{"react", "React"}, {"reactjs", "React"}, {"vue", "Vue.js"}, {"vuejs", "Vue.js"}, {"vue.js", "Vue.js"},
		{"angular", "Angular"}, {"angularjs", "AngularJS"}, {"spring", "Spring Framework"},
		{"spring boot", "Spring Boot"}, {"springboot", "Spring Boot"}, {"django", "Django"},
		{"flask", "Flask"}, {"express", "Express.js"}, {"expressjs", "Express.js"}, {"express.js", "Express.js"},
		{"laravel", "Laravel"}, {"symfony", "Symfony"}, {"ruby", "Ruby"}, {"ruby on rails", "Ruby on Rails"},
		{"ror", "Ruby on Rails"}, {"rails", "Ruby on Rails"}, {"go", "Go"}, {"golang", "Go"},
		{"kotlin", "Kotlin"}, {"swift", "Swift"}, {"rust", "Rust"}, {"scala", "Scala"},
		{"r", "R"}, {"r-lang", "R"}, {"matlab", "MATLAB"}, {"Matlab", "MATLAB"},

		// クラウド・ツール (20パターン以上)
		{"aws", "AWS"}, {"amazon web services", "AWS"}, {"ec2", "Amazon EC2"}, {"s3", "Amazon S3"},
		{"rds", "Amazon RDS"}, {"lambda", "AWS Lambda"}, {"azure", "Microsoft Azure"},
		{"Microsoft Azure", "Microsoft Azure"}, {"gcp", "Google Cloud Platform"},
		{"google cloud", "Google Cloud Platform"}, {"gce", "Google Compute Engine"},
		{"git", "Git"}, {"github", "GitHub"}, {"gitlab", "GitLab"}, {"jenkins", "Jenkins"},
		{"jira", "JIRA"}, {"confluence", "Confluence"}, {"slack", "Slack"}, {"vscode", "Visual Studio Code"},
		{"vs code", "Visual Studio Code"}, {"intellij", "IntelliJ IDEA"}, {"idea", "IntelliJ IDEA"},
		{"eclipse", "Eclipse"}, {"postman", "Postman"}, {"swagger", "Swagger"}, {"terraform", "Terraform"},
		{"ansible", "Ansible"},
	}

	// 各テストケースを実行
	for i, tc := range testCases {
		t.Run(fmt.Sprintf("case_%d_%s", i+1, tc.input), func(t *testing.T) {
			result := normalizer.Normalize(tc.input)
			assert.Equal(t, tc.expected, result, "Input: %s", tc.input)
		})
	}

	// 100パターンを超えていることを確認
	assert.GreaterOrEqual(t, len(testCases), 100, "Should have at least 100 test cases")
}
