package normalizer

import (
	"regexp"
	"strings"
)

// TechnologyNormalizer 技術名正規化器
type TechnologyNormalizer struct {
	// 正規化ルール：入力 -> 正規化後の名前
	normalizationRules map[string]string
	// 正規表現ルール：パターン -> 正規化後の名前
	regexRules []RegexRule
}

// RegexRule 正規表現による正規化ルール
type RegexRule struct {
	Pattern     *regexp.Regexp
	Replacement string
}

// NewTechnologyNormalizer 技術名正規化器のコンストラクタ
func NewTechnologyNormalizer() *TechnologyNormalizer {
	normalizer := &TechnologyNormalizer{
		normalizationRules: make(map[string]string),
		regexRules:         make([]RegexRule, 0),
	}

	// デフォルトルールを設定
	normalizer.initializeDefaultRules()

	return normalizer
}

// initializeDefaultRules デフォルトの正規化ルールを初期化
func (tn *TechnologyNormalizer) initializeDefaultRules() {
	// プログラミング言語の正規化ルール
	programmingLanguages := map[string]string{
		// Java関連
		"java":    "Java",
		"JAVA":    "Java",
		"java8":   "Java",
		"java11":  "Java",
		"java17":  "Java",
		"java21":  "Java",
		"openjdk": "Java",

		// JavaScript関連
		"javascript": "JavaScript",
		"js":         "JavaScript",
		"JS":         "JavaScript",
		"es6":        "JavaScript",
		"es2015":     "JavaScript",
		"ecmascript": "JavaScript",
		"nodejs":     "Node.js",
		"node.js":    "Node.js",
		"node":       "Node.js",

		// TypeScript関連
		"typescript": "TypeScript",
		"ts":         "TypeScript",
		"TS":         "TypeScript",

		// Python関連
		"python":  "Python",
		"python3": "Python",
		"python2": "Python",
		"py":      "Python",

		// C#関連
		"c#":         "C#",
		"csharp":     "C#",
		"c-sharp":    "C#",
		"cs":         "C#",
		"C#":         "C#",
		"dotnet":     ".NET",
		".net":       ".NET",
		"dotnetcore": ".NET Core",
		".net core":  ".NET Core",

		// C/C++関連
		"c":         "C",
		"C":         "C",
		"c++":       "C++",
		"cpp":       "C++",
		"cplusplus": "C++",

		// PHP関連
		"php":  "PHP",
		"PHP":  "PHP",
		"php7": "PHP",
		"php8": "PHP",

		// Ruby関連
		"ruby":          "Ruby",
		"Ruby":          "Ruby",
		"ruby on rails": "Ruby on Rails",
		"ror":           "Ruby on Rails",
		"rails":         "Ruby on Rails",

		// Go関連
		"go":     "Go",
		"golang": "Go",
		"Golang": "Go",

		// Kotlin関連
		"kotlin": "Kotlin",
		"Kotlin": "Kotlin",

		// Swift関連
		"swift": "Swift",
		"Swift": "Swift",

		// Rust関連
		"rust": "Rust",
		"Rust": "Rust",

		// Scala関連
		"scala": "Scala",
		"Scala": "Scala",

		// R関連
		"r":      "R",
		"R":      "R",
		"r-lang": "R",

		// MATLAB関連
		"matlab": "MATLAB",
		"Matlab": "MATLAB",
		"MATLAB": "MATLAB",
	}

	// データベース・サーバーの正規化ルール
	serversAndDatabases := map[string]string{
		// MySQL関連
		"mysql":   "MySQL",
		"MySQL":   "MySQL",
		"mysql5":  "MySQL",
		"mysql8":  "MySQL",
		"mariadb": "MariaDB",
		"MariaDB": "MariaDB",

		// PostgreSQL関連
		"postgresql": "PostgreSQL",
		"postgres":   "PostgreSQL",
		"pgsql":      "PostgreSQL",
		"PostgreSQL": "PostgreSQL",

		// Oracle関連
		"oracle":    "Oracle Database",
		"Oracle":    "Oracle Database",
		"oracle db": "Oracle Database",
		"oracledb":  "Oracle Database",

		// SQL Server関連
		"sqlserver":  "SQL Server",
		"sql server": "SQL Server",
		"mssql":      "SQL Server",
		"SQL Server": "SQL Server",

		// Redis関連
		"redis": "Redis",
		"Redis": "Redis",

		// MongoDB関連
		"mongodb": "MongoDB",
		"mongo":   "MongoDB",
		"MongoDB": "MongoDB",

		// Elasticsearch関連
		"elasticsearch": "Elasticsearch",
		"elastic":       "Elasticsearch",
		"es":            "Elasticsearch",

		// Apache関連
		"apache":  "Apache HTTP Server",
		"httpd":   "Apache HTTP Server",
		"apache2": "Apache HTTP Server",

		// Nginx関連
		"nginx": "Nginx",
		"Nginx": "Nginx",
		"NGINX": "Nginx",

		// Docker関連
		"docker":         "Docker",
		"Docker":         "Docker",
		"docker-compose": "Docker Compose",
		"dockercompose":  "Docker Compose",

		// Kubernetes関連
		"kubernetes": "Kubernetes",
		"k8s":        "Kubernetes",
		"kube":       "Kubernetes",

		// キャッシュ関連
		"memcached": "Memcached",
		"Memcached": "Memcached",
	}

	// ツール・フレームワークの正規化ルール
	tools := map[string]string{
		// Git関連
		"git":    "Git",
		"Git":    "Git",
		"github": "GitHub",
		"GitHub": "GitHub",
		"gitlab": "GitLab",
		"GitLab": "GitLab",

		// Jenkins関連
		"jenkins": "Jenkins",
		"Jenkins": "Jenkins",

		// JIRA関連
		"jira": "JIRA",
		"Jira": "JIRA",
		"JIRA": "JIRA",

		// Confluence関連
		"confluence": "Confluence",
		"Confluence": "Confluence",

		// Slack関連
		"slack": "Slack",
		"Slack": "Slack",

		// IDEエディタ関連
		"vscode":             "Visual Studio Code",
		"vs code":            "Visual Studio Code",
		"visual studio code": "Visual Studio Code",
		"intellij":           "IntelliJ IDEA",
		"idea":               "IntelliJ IDEA",
		"eclipse":            "Eclipse",
		"Eclipse":            "Eclipse",

		// フレームワーク関連
		"react":       "React",
		"React":       "React",
		"reactjs":     "React",
		"vue":         "Vue.js",
		"vuejs":       "Vue.js",
		"vue.js":      "Vue.js",
		"angular":     "Angular",
		"Angular":     "Angular",
		"angularjs":   "AngularJS",
		"spring":      "Spring Framework",
		"spring boot": "Spring Boot",
		"springboot":  "Spring Boot",
		"django":      "Django",
		"Django":      "Django",
		"flask":       "Flask",
		"Flask":       "Flask",
		"express":     "Express.js",
		"expressjs":   "Express.js",
		"express.js":  "Express.js",
		"laravel":     "Laravel",
		"Laravel":     "Laravel",
		"symfony":     "Symfony",
		"Symfony":     "Symfony",

		// AWS関連
		"aws":                 "AWS",
		"amazon web services": "AWS",
		"ec2":                 "Amazon EC2",
		"s3":                  "Amazon S3",
		"rds":                 "Amazon RDS",
		"lambda":              "AWS Lambda",

		// Azure関連
		"azure":           "Microsoft Azure",
		"Microsoft Azure": "Microsoft Azure",

		// GCP関連
		"gcp":          "Google Cloud Platform",
		"google cloud": "Google Cloud Platform",
		"gce":          "Google Compute Engine",

		// その他
		"postman":   "Postman",
		"Postman":   "Postman",
		"swagger":   "Swagger",
		"Swagger":   "Swagger",
		"terraform": "Terraform",
		"Terraform": "Terraform",
		"ansible":   "Ansible",
		"Ansible":   "Ansible",
	}

	// すべてのルールをマージ
	for k, v := range programmingLanguages {
		tn.normalizationRules[k] = v
	}
	for k, v := range serversAndDatabases {
		tn.normalizationRules[k] = v
	}
	for k, v := range tools {
		tn.normalizationRules[k] = v
	}

	// 正規表現ルールを追加
	tn.initializeRegexRules()
}

// initializeRegexRules 正規表現による正規化ルールを初期化
func (tn *TechnologyNormalizer) initializeRegexRules() {
	// バージョン番号を除去するルール
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(java)\s*(\d+(\.\d+)*)$`),
		Replacement: "Java",
	})
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(python)\s*(\d+(\.\d+)*)$`),
		Replacement: "Python",
	})
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(php)\s*(\d+(\.\d+)*)$`),
		Replacement: "PHP",
	})
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(mysql)\s*(\d+(\.\d+)*)$`),
		Replacement: "MySQL",
	})
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(postgresql)\s*(\d+(\.\d+)*)$`),
		Replacement: "PostgreSQL",
	})

	// .NET系の正規化
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^(\.net)\s*(core|framework)?\s*(\d+(\.\d+)*)?$`),
		Replacement: ".NET",
	})

	// Spring系の正規化
	tn.regexRules = append(tn.regexRules, RegexRule{
		Pattern:     regexp.MustCompile(`(?i)^spring\s*(boot|mvc|security|data)?$`),
		Replacement: "Spring Framework",
	})
}

// Normalize 技術名を正規化
func (tn *TechnologyNormalizer) Normalize(input string) string {
	if input == "" {
		return input
	}

	// 前後の空白を除去
	normalized := strings.TrimSpace(input)

	// 空文字の場合はそのまま返す
	if normalized == "" {
		return ""
	}

	// 小文字での完全一致チェック
	lowerInput := strings.ToLower(normalized)
	if result, exists := tn.normalizationRules[lowerInput]; exists {
		return result
	}

	// 正規表現ルールでチェック
	for _, rule := range tn.regexRules {
		if rule.Pattern.MatchString(normalized) {
			return rule.Replacement
		}
	}

	// 部分一致での候補検索（フォールバック） - 3文字以上の場合のみ
	if len(lowerInput) >= 3 {
		for key, value := range tn.normalizationRules {
			// 入力が正規化済みの値に部分一致する場合
			if len(key) >= 3 && strings.Contains(strings.ToLower(value), lowerInput) {
				return value
			}
			// 正規化済みの値が入力に部分一致する場合
			if len(key) >= 3 && strings.Contains(lowerInput, strings.ToLower(key)) {
				return value
			}
		}
	}

	// マッチするルールがない場合は、最初の文字を大文字にして返す
	return capitalizeFirst(normalized)
}

// GetSuggestions 入力に対する候補を取得
func (tn *TechnologyNormalizer) GetSuggestions(input string, limit int) []string {
	if input == "" || limit <= 0 {
		return []string{}
	}

	lowerInput := strings.ToLower(strings.TrimSpace(input))
	suggestions := make([]string, 0, limit)
	seen := make(map[string]bool)

	// 前方一致での検索
	for key, value := range tn.normalizationRules {
		if strings.HasPrefix(strings.ToLower(key), lowerInput) && !seen[value] {
			suggestions = append(suggestions, value)
			seen[value] = true
			if len(suggestions) >= limit {
				break
			}
		}
	}

	// 部分一致での検索（前方一致で足りない場合）
	if len(suggestions) < limit {
		for key, value := range tn.normalizationRules {
			if strings.Contains(strings.ToLower(key), lowerInput) && !seen[value] {
				suggestions = append(suggestions, value)
				seen[value] = true
				if len(suggestions) >= limit {
					break
				}
			}
		}
	}

	return suggestions
}

// IsKnownTechnology 既知の技術かどうかを判定
func (tn *TechnologyNormalizer) IsKnownTechnology(input string) bool {
	if input == "" {
		return false
	}

	normalized := tn.Normalize(input)
	lowerInput := strings.ToLower(strings.TrimSpace(input))

	// 正規化結果が元の入力と大きく異なる場合は既知の技術
	if strings.ToLower(normalized) != lowerInput {
		return true
	}

	// 直接マッチする場合
	_, exists := tn.normalizationRules[lowerInput]
	return exists
}

// AddCustomRule カスタム正規化ルールを追加
func (tn *TechnologyNormalizer) AddCustomRule(input, normalized string) {
	if input != "" && normalized != "" {
		tn.normalizationRules[strings.ToLower(strings.TrimSpace(input))] = normalized
	}
}

// capitalizeFirst 最初の文字を大文字にする
func capitalizeFirst(s string) string {
	if s == "" {
		return s
	}

	runes := []rune(s)
	if len(runes) > 0 {
		runes[0] = []rune(strings.ToUpper(string(runes[0])))[0]
	}

	return string(runes)
}
