package config

import (
	"testing"
)

func TestCognitoConfig_GetIssuer(t *testing.T) {
	tests := []struct {
		name     string
		config   *CognitoConfig
		expected string
		desc     string
	}{
		{
			name: "ローカル環境_cognito-local_port_9229",
			config: &CognitoConfig{
				Endpoint:   "http://cognito-local:9229",
				UserPoolID: "local_test123",
				Region:     "us-east-1",
			},
			expected: "http://0.0.0.0:9229/local_test123",
			desc:     "cognito-local:9229 → 0.0.0.0:9229 に変換されること",
		},
		{
			name: "ローカル環境_localhost_port_9230",
			config: &CognitoConfig{
				Endpoint:   "http://localhost:9230",
				UserPoolID: "local_test456",
				Region:     "us-east-1",
			},
			expected: "http://0.0.0.0:9230/local_test456",
			desc:     "localhost:9230 → 0.0.0.0:9230 に変換されること",
		},
		{
			name: "ローカル環境_直接IP指定",
			config: &CognitoConfig{
				Endpoint:   "http://127.0.0.1:9229",
				UserPoolID: "local_test789",
				Region:     "us-east-1",
			},
			expected: "http://127.0.0.1:9229/local_test789",
			desc:     "直接IP指定の場合はそのまま使用されること",
		},
		{
			name: "ローカル環境_ポート番号なし",
			config: &CognitoConfig{
				Endpoint:   "http://cognito-local",
				UserPoolID: "local_testnoport",
				Region:     "us-east-1",
			},
			expected: "http://0.0.0.0/local_testnoport",
			desc:     "ポート番号がない場合は省略されること",
		},
		{
			name: "本番環境_Endpoint未設定",
			config: &CognitoConfig{
				Endpoint:   "",
				UserPoolID: "prod_pool_123",
				Region:     "ap-northeast-1",
			},
			expected: "https://cognito-idp.ap-northeast-1.amazonaws.com/prod_pool_123",
			desc:     "本番環境のURL形式が正しく生成されること",
		},
		{
			name: "本番環境_US_East",
			config: &CognitoConfig{
				Endpoint:   "",
				UserPoolID: "us_pool_456",
				Region:     "us-east-1",
			},
			expected: "https://cognito-idp.us-east-1.amazonaws.com/us_pool_456",
			desc:     "US East リージョンの本番環境URL",
		},
		{
			name: "不正なURL形式",
			config: &CognitoConfig{
				Endpoint:   "invalid://url:with:multiple:colons",
				UserPoolID: "error_pool",
				Region:     "us-east-1",
			},
			expected: "http://0.0.0.0:9229/error_pool",
			desc:     "不正なURL形式の場合はデフォルト値が返されること",
		},
		{
			name: "空のEndpoint文字列",
			config: &CognitoConfig{
				Endpoint:   " ",
				UserPoolID: "space_pool",
				Region:     "us-west-2",
			},
			expected: "http://0.0.0.0:9229/space_pool",
			desc:     "空白文字のEndpointはローカル環境として扱われること",
		},
		{
			name: "HTTPS_ローカル環境",
			config: &CognitoConfig{
				Endpoint:   "https://localhost:9443",
				UserPoolID: "ssl_pool",
				Region:     "us-east-1",
			},
			expected: "http://0.0.0.0:9443/ssl_pool",
			desc:     "HTTPSでもHTTPに変換されること",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.config.GetIssuer()
			if result != tt.expected {
				t.Errorf("GetIssuer() = %v, expected %v\nテストケース: %s", result, tt.expected, tt.desc)
			}
		})
	}
}

func TestCognitoConfig_GetIssuer_EdgeCases(t *testing.T) {
	t.Run("nil_config", func(t *testing.T) {
		// nilポインタの場合のテスト（実際にはpanicが発生するかもしれないが、防御的テスト）
		defer func() {
			if r := recover(); r == nil {
				t.Errorf("nil configでpanicが発生することを期待したが、発生しなかった")
			}
		}()

		var config *CognitoConfig
		_ = config.GetIssuer()
	})

	t.Run("empty_user_pool_id", func(t *testing.T) {
		config := &CognitoConfig{
			Endpoint:   "http://cognito-local:9229",
			UserPoolID: "",
			Region:     "us-east-1",
		}
		result := config.GetIssuer()
		expected := "http://0.0.0.0:9229/"
		if result != expected {
			t.Errorf("GetIssuer() = %v, expected %v", result, expected)
		}
	})

	t.Run("empty_region_production", func(t *testing.T) {
		config := &CognitoConfig{
			Endpoint:   "",
			UserPoolID: "test_pool",
			Region:     "",
		}
		result := config.GetIssuer()
		expected := "https://cognito-idp..amazonaws.com/test_pool"
		if result != expected {
			t.Errorf("GetIssuer() = %v, expected %v", result, expected)
		}
	})
}

func TestCognitoConfig_GetIssuer_Integration(t *testing.T) {
	t.Run("実際の設定値でのテスト", func(t *testing.T) {
		// 実際のDocker環境で使用される設定値
		config := &CognitoConfig{
			Endpoint:   "http://cognito-local:9229",
			UserPoolID: "local_7221v1tw",
			Region:     "us-east-1",
		}

		result := config.GetIssuer()
		expected := "http://0.0.0.0:9229/local_7221v1tw"

		if result != expected {
			t.Errorf("実際の設定でのGetIssuer() = %v, expected %v", result, expected)
		}

		t.Logf("実際の設定での結果: %s", result)
	})
}

// ベンチマークテスト（パフォーマンス確認用）
func BenchmarkCognitoConfig_GetIssuer(b *testing.B) {
	config := &CognitoConfig{
		Endpoint:   "http://cognito-local:9229",
		UserPoolID: "local_benchmark",
		Region:     "us-east-1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = config.GetIssuer()
	}
}

func BenchmarkCognitoConfig_GetIssuer_Production(b *testing.B) {
	config := &CognitoConfig{
		Endpoint:   "",
		UserPoolID: "prod_benchmark",
		Region:     "us-east-1",
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = config.GetIssuer()
	}
}
