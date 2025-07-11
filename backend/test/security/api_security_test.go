package security

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/duesk/monstera/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestAPISecurity API セキュリティのテストスイート
func TestAPISecurity(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("CORS", func(t *testing.T) {
		testCORSSecurity(t)
	})

	t.Run("HTTPSEnforcement", func(t *testing.T) {
		testHTTPSEnforcement(t)
	})

	t.Run("SecurityHeaders", func(t *testing.T) {
		testSecurityHeaders(t)
	})

	t.Run("InputSanitization", func(t *testing.T) {
		testInputSanitization(t)
	})

	t.Run("FileUploadSecurity", func(t *testing.T) {
		testFileUploadSecurity(t)
	})

	t.Run("APIVersioning", func(t *testing.T) {
		testAPIVersioningSecurity(t)
	})

	t.Run("ErrorHandling", func(t *testing.T) {
		testSecureErrorHandling(t)
	})
}

// testCORSSecurity CORS セキュリティテスト
func testCORSSecurity(t *testing.T) {
	t.Run("CORS設定の検証", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.CORSConfig())
		router.GET("/api/data", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": "test"})
		})

		// 許可されたオリジンからのリクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/data", nil)
		req.Header.Set("Origin", "https://trusted-domain.com")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Equal(t, "https://trusted-domain.com", w.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("不正なオリジンの拒否", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.CORSConfig())
		router.GET("/api/data", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": "test"})
		})

		// 許可されていないオリジンからのリクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/data", nil)
		req.Header.Set("Origin", "https://malicious-site.com")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
	})

	t.Run("プリフライトリクエストの処理", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.CORSConfig())
		router.POST("/api/data", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": "created"})
		})

		// OPTIONS リクエスト（プリフライト）
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("OPTIONS", "/api/data", nil)
		req.Header.Set("Origin", "https://trusted-domain.com")
		req.Header.Set("Access-Control-Request-Method", "POST")
		req.Header.Set("Access-Control-Request-Headers", "Content-Type")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "POST")
		assert.Contains(t, w.Header().Get("Access-Control-Allow-Headers"), "Content-Type")
	})

	t.Run("不正なHTTPメソッドの拒否", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.CORSConfig())
		router.POST("/api/data", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": "created"})
		})

		// 許可されていないメソッドでのプリフライト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("OPTIONS", "/api/data", nil)
		req.Header.Set("Origin", "https://trusted-domain.com")
		req.Header.Set("Access-Control-Request-Method", "DELETE")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

// testHTTPSEnforcement HTTPS 強制テスト
func testHTTPSEnforcement(t *testing.T) {
	t.Run("HTTP から HTTPS へのリダイレクト", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.ForceHTTPS())
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "secure"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "http://example.com/", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusMovedPermanently, w.Code)
		assert.Contains(t, w.Header().Get("Location"), "https://")
	})

	t.Run("HSTS ヘッダーの設定", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.ForceHTTPS())
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "secure"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/", nil)
		req.Header.Set("X-Forwarded-Proto", "https")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Header().Get("Strict-Transport-Security"), "max-age=31536000")
	})
}

// testSecurityHeaders セキュリティヘッダーテスト
func testSecurityHeaders(t *testing.T) {
	t.Run("必須セキュリティヘッダーの確認", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.SecurityHeaders())
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "test"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/", nil)
		router.ServeHTTP(w, req)

		expectedHeaders := map[string]string{
			"X-XSS-Protection":        "1; mode=block",
			"X-Content-Type-Options":  "nosniff",
			"X-Frame-Options":         "DENY",
			"Content-Security-Policy": "default-src 'self'",
			"Referrer-Policy":         "strict-origin-when-cross-origin",
		}

		for header, expectedValue := range expectedHeaders {
			assert.Equal(t, expectedValue, w.Header().Get(header),
				"Header %s should be set correctly", header)
		}
	})

	t.Run("CSPヘッダーの詳細検証", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.EnhancedCSP())
		router.GET("/", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "test"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/", nil)
		router.ServeHTTP(w, req)

		csp := w.Header().Get("Content-Security-Policy")
		assert.Contains(t, csp, "default-src 'self'")
		assert.Contains(t, csp, "script-src 'self'")
		assert.Contains(t, csp, "style-src 'self' 'unsafe-inline'")
		assert.Contains(t, csp, "img-src 'self' data:")
		assert.Contains(t, csp, "connect-src 'self'")
		assert.Contains(t, csp, "font-src 'self'")
		assert.Contains(t, csp, "object-src 'none'")
		assert.Contains(t, csp, "media-src 'self'")
		assert.Contains(t, csp, "frame-src 'none'")
	})
}

// testInputSanitization 入力サニタイゼーションテスト
func testInputSanitization(t *testing.T) {
	t.Run("HTMLインジェクション防止", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.InputSanitization())
		router.POST("/comment", func(c *gin.Context) {
			var req map[string]interface{}
			c.ShouldBindJSON(&req)
			c.JSON(http.StatusOK, req)
		})

		maliciousInputs := []map[string]interface{}{
			{"comment": "<script>alert('xss')</script>"},
			{"comment": "<img src=x onerror=alert('xss')>"},
			{"comment": "javascript:alert('xss')"},
			{"comment": "<svg onload=alert('xss')>"},
		}

		for _, input := range maliciousInputs {
			body, _ := json.Marshal(input)
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("POST", "/comment", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")
			router.ServeHTTP(w, req)

			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)

			comment := response["comment"].(string)
			assert.NotContains(t, comment, "<script>")
			assert.NotContains(t, comment, "javascript:")
			assert.NotContains(t, comment, "onerror=")
			assert.NotContains(t, comment, "onload=")
		}
	})

	t.Run("Path Traversal攻撃防止", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.PathTraversalProtection())
		router.GET("/file/:filename", func(c *gin.Context) {
			filename := c.Param("filename")
			if strings.Contains(filename, "..") {
				c.JSON(http.StatusBadRequest, gin.H{"error": "不正なパス"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"filename": filename})
		})

		maliciousPaths := []string{
			"../../../etc/passwd",
			"..\\..\\..\\windows\\system32\\config\\sam",
			"....//....//....//etc//passwd",
			"%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
		}

		for _, path := range maliciousPaths {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", "/file/"+path, nil)
			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code,
				"Malicious path should be blocked: %s", path)
		}
	})

	t.Run("ファイル拡張子検証", func(t *testing.T) {
		allowedExtensions := []string{".jpg", ".jpeg", ".png", ".gif", ".pdf"}
		dangerousFiles := []string{
			"malware.exe",
			"script.js",
			"shell.sh",
			"virus.bat",
			"trojan.com",
		}

		for _, filename := range dangerousFiles {
			isAllowed := isFileExtensionAllowed(filename, allowedExtensions)
			assert.False(t, isAllowed,
				"Dangerous file should not be allowed: %s", filename)
		}

		safeFiles := []string{
			"image.jpg",
			"document.pdf",
			"photo.png",
		}

		for _, filename := range safeFiles {
			isAllowed := isFileExtensionAllowed(filename, allowedExtensions)
			assert.True(t, isAllowed,
				"Safe file should be allowed: %s", filename)
		}
	})
}

// testFileUploadSecurity ファイルアップロードセキュリティテスト
func testFileUploadSecurity(t *testing.T) {
	t.Run("ファイルサイズ制限", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.FileSizeLimit(1024)) // 1KB制限
		router.POST("/upload", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "uploaded"})
		})

		// 大きすぎるファイル
		largeContent := strings.Repeat("a", 2048) // 2KB

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/upload", strings.NewReader(largeContent))
		req.Header.Set("Content-Type", "multipart/form-data")
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
	})

	t.Run("ファイルタイプ検証", func(t *testing.T) {
		maliciousFiles := []struct {
			filename    string
			contentType string
			content     []byte
		}{
			{"evil.exe", "application/octet-stream", []byte("MZ\x90\x00")}, // PE header
			{"script.js", "application/javascript", []byte("alert('xss')")},
			{"shell.sh", "text/plain", []byte("#!/bin/bash\nrm -rf /")},
			{"fake.jpg", "image/jpeg", []byte("<?php system($_GET['cmd']); ?>")}, // PHP in fake image
		}

		for _, file := range maliciousFiles {
			isSafe := validateFileContent(file.content, file.filename)
			assert.False(t, isSafe,
				"Malicious file should be rejected: %s", file.filename)
		}
	})

	t.Run("ファイルメタデータのサニタイゼーション", func(t *testing.T) {
		maliciousFilenames := []string{
			"<script>alert('xss')</script>.jpg",
			"'; DROP TABLE files; --.png",
			"../../../etc/passwd.gif",
			"con.jpg", // Windows reserved name
			"prn.png", // Windows reserved name
		}

		for _, filename := range maliciousFilenames {
			sanitized := sanitizeFilename(filename)
			assert.NotEqual(t, filename, sanitized,
				"Malicious filename should be sanitized: %s", filename)
			assert.NotContains(t, sanitized, "<script>")
			assert.NotContains(t, sanitized, "../")
			assert.NotContains(t, sanitized, "DROP TABLE")
		}
	})
}

// testAPIVersioningSecurity API バージョニングセキュリティテスト
func testAPIVersioningSecurity(t *testing.T) {
	t.Run("非推奨APIバージョンの警告", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.APIVersioning())

		// 古いバージョンのAPI
		router.GET("/api/v1/users", func(c *gin.Context) {
			c.Header("Warning", "299 - \"API version v1 is deprecated. Please use v2.\"")
			c.JSON(http.StatusOK, gin.H{"users": []string{}})
		})

		// 新しいバージョンのAPI
		router.GET("/api/v2/users", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"users": []string{}})
		})

		// v1へのリクエスト
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v1/users", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Header().Get("Warning"), "deprecated")

		// v2へのリクエスト
		w2 := httptest.NewRecorder()
		req2, _ := http.NewRequest("GET", "/api/v2/users", nil)
		router.ServeHTTP(w2, req2)

		assert.Equal(t, http.StatusOK, w2.Code)
		assert.Empty(t, w2.Header().Get("Warning"))
	})

	t.Run("サポート終了APIの無効化", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.APIVersioning())

		// サポート終了したAPI
		router.GET("/api/v0/legacy", func(c *gin.Context) {
			c.JSON(http.StatusGone, gin.H{
				"error":   "API version v0 is no longer supported",
				"message": "Please upgrade to v2 or later",
			})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/api/v0/legacy", nil)
		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusGone, w.Code)
		assert.Contains(t, w.Body.String(), "no longer supported")
	})
}

// testSecureErrorHandling セキュアなエラーハンドリングテスト
func testSecureErrorHandling(t *testing.T) {
	t.Run("機密情報の漏洩防止", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.SecureErrorHandler())
		router.GET("/error", func(c *gin.Context) {
			// 内部エラーをシミュレート
			err := fmt.Errorf("database connection failed: user=admin password=secret123 host=internal-db.company.com")
			c.Error(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/error", nil)
		router.ServeHTTP(w, req)

		// レスポンスに機密情報が含まれていないことを確認
		response := w.Body.String()
		assert.NotContains(t, response, "password=secret123")
		assert.NotContains(t, response, "internal-db.company.com")
		assert.NotContains(t, response, "user=admin")
		assert.Contains(t, response, "internal error")
	})

	t.Run("エラーログの適切な記録", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.ErrorLogging())
		router.GET("/error", func(c *gin.Context) {
			err := fmt.Errorf("test error for logging")
			c.Error(err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong"})
		})

		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/error", nil)
		router.ServeHTTP(w, req)

		// エラーレスポンスが適切にサニタイズされていることを確認
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "something went wrong")
		assert.NotContains(t, w.Body.String(), "test error for logging")
	})

	t.Run("攻撃の痕跡検出", func(t *testing.T) {
		router := gin.New()
		router.Use(middleware.AttackDetection())
		router.GET("/sensitive", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": "sensitive"})
		})

		suspiciousRequests := []string{
			"/sensitive?id=1' OR '1'='1",
			"/sensitive?search=<script>alert('xss')</script>",
			"/sensitive?file=../../../etc/passwd",
			"/sensitive?cmd=; cat /etc/passwd",
		}

		for _, path := range suspiciousRequests {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest("GET", path, nil)
			router.ServeHTTP(w, req)

			// 攻撃的なリクエストは拒否されるべき
			assert.NotEqual(t, http.StatusOK, w.Code,
				"Suspicious request should be blocked: %s", path)
		}
	})
}

// Helper functions for API security tests

func isFileExtensionAllowed(filename string, allowedExtensions []string) bool {
	for _, ext := range allowedExtensions {
		if strings.HasSuffix(strings.ToLower(filename), ext) {
			return true
		}
	}
	return false
}

func validateFileContent(content []byte, filename string) bool {
	// ファイル内容の検証（マジックバイト、スクリプト検出など）

	// PE ヘッダーの検出
	if len(content) >= 2 && content[0] == 0x4D && content[1] == 0x5A {
		return false // Windows executable
	}

	// ELF ヘッダーの検出
	if len(content) >= 4 && content[0] == 0x7F && content[1] == 0x45 && content[2] == 0x4C && content[3] == 0x46 {
		return false // Linux executable
	}

	// スクリプト検出
	contentStr := string(content)
	dangerousPatterns := []string{
		"<?php",
		"#!/bin/bash",
		"#!/bin/sh",
		"<script>",
		"javascript:",
		"eval(",
		"system(",
		"exec(",
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(strings.ToLower(contentStr), strings.ToLower(pattern)) {
			return false
		}
	}

	return true
}

func sanitizeFilename(filename string) string {
	// ファイル名のサニタイゼーション
	replacements := map[string]string{
		"<":           "",
		">":           "",
		":":           "",
		"\"":          "",
		"|":           "",
		"?":           "",
		"*":           "",
		"<script>":    "",
		"</script>":   "",
		"../":         "",
		"..\\":        "",
		"DROP TABLE":  "",
		"INSERT INTO": "",
		"DELETE FROM": "",
	}

	sanitized := filename
	for old, new := range replacements {
		sanitized = strings.ReplaceAll(sanitized, old, new)
	}

	// Windows予約名の処理
	windowsReserved := []string{"CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9"}
	baseName := strings.ToUpper(sanitized)
	if dotIndex := strings.LastIndex(baseName, "."); dotIndex > 0 {
		baseName = baseName[:dotIndex]
	}

	for _, reserved := range windowsReserved {
		if baseName == reserved {
			sanitized = "safe_" + sanitized
			break
		}
	}

	return sanitized
}
