package unit

import (
	"testing"

	"github.com/duesk/monstera/internal/model"
	"github.com/duesk/monstera/test/cognito"
	"github.com/stretchr/testify/assert"
)

// TestCognito_TestEnvironmentSetup テスト環境のセットアップが正常に動作するかテスト
func TestCognito_TestEnvironmentSetup(t *testing.T) {
	// テスト設定のセットアップ
	testConfig, err := cognito.SetupTestConfig()
	if err != nil {
		t.Skipf("テスト環境のセットアップに失敗しました（データベースが利用できない可能性があります）: %v", err)
		return
	}
	defer func() {
		if testConfig != nil {
			testConfig.Cleanup()
		}
	}()

	// 基本的な設定の検証
	assert.NotNil(t, testConfig.DB, "データベース接続が確立されていません")
	assert.NotNil(t, testConfig.Config, "設定が読み込まれていません")
	assert.NotNil(t, testConfig.Logger, "ロガーが初期化されていません")

	// Cognito設定の検証
	assert.True(t, testConfig.Config.Cognito.Enabled, "Cognito機能が有効になっていません")
	assert.Equal(t, "us-east-1", testConfig.Config.Cognito.Region, "Cognitoリージョンが正しく設定されていません")
	assert.Equal(t, "local_7221v1tw", testConfig.Config.Cognito.UserPoolID, "User Pool IDが正しく設定されていません")
	assert.Equal(t, "62h69i1tpbn9rmh83xmtjyj4b", testConfig.Config.Cognito.ClientID, "Client IDが正しく設定されていません")
	assert.Equal(t, "http://localhost:9229", testConfig.Config.Cognito.Endpoint, "エンドポイントが正しく設定されていません")
}

// TestCognito_MockCreation モックの作成が正常に動作するかテスト
func TestCognito_MockCreation(t *testing.T) {
	// テスト設定のセットアップ
	testConfig, err := cognito.SetupTestConfig()
	if err != nil {
		t.Skipf("テスト環境のセットアップに失敗しました（データベースが利用できない可能性があります）: %v", err)
		return
	}
	defer func() {
		if testConfig != nil {
			testConfig.Cleanup()
		}
	}()

	// テストユーザーの作成
	testUser := testConfig.CreateTestUser("test@duesk.co.jp", 4)
	assert.NotNil(t, testUser, "テストユーザーが作成されませんでした")
	assert.Equal(t, "test@duesk.co.jp", testUser.Email, "テストユーザーのメールアドレスが正しくありません")
	assert.Equal(t, model.Role(4), testUser.Role, "テストユーザーのロールが正しくありません")
	assert.NotEmpty(t, testUser.CognitoSub, "CognitoSubが設定されていません")
	assert.Equal(t, "active", testUser.Status, "ユーザーステータスが正しくありません")

	// 事前定義テストユーザーの取得
	testUsers := cognito.GetTestUsers()
	assert.Len(t, testUsers, 3, "事前定義テストユーザーの数が正しくありません")
	assert.Equal(t, "admin@test.com", testUsers[0].Email, "管理者ユーザーのメールアドレスが正しくありません")
	assert.Equal(t, "manager@test.com", testUsers[1].Email, "マネージャーユーザーのメールアドレスが正しくありません")
	assert.Equal(t, "employee@test.com", testUsers[2].Email, "従業員ユーザーのメールアドレスが正しくありません")
}

// TestCognito_LoggerConfiguration ロガー設定のテスト
func TestCognito_LoggerConfiguration(t *testing.T) {
	// テスト設定のセットアップ
	testConfig, err := cognito.SetupTestConfig()
	if err != nil {
		t.Skipf("テスト環境のセットアップに失敗しました（データベースが利用できない可能性があります）: %v", err)
		return
	}
	defer func() {
		if testConfig != nil {
			testConfig.Cleanup()
		}
	}()

	// ロガーが適切に設定されているか確認
	assert.NotNil(t, testConfig.Logger, "ロガーが初期化されていません")

	// ログレベルのテスト（development モード）
	testConfig.Logger.Info("テストログメッセージ")
	testConfig.Logger.Debug("デバッグログメッセージ")
	// ログ出力はエラーにならないことを確認（実際のログ内容は目視確認）
}

// TestCognito_ConfigurationOnly 設定のみのテスト（データベース接続なし）
func TestCognito_ConfigurationOnly(t *testing.T) {
	// Cognito-Localが動作しているかチェック
	isRunning := cognito.IsCognitoLocalRunning()
	t.Logf("Cognito-Local動作状況: %v", isRunning)

	// 基本的なテストユーザー作成のテスト（メモリ内のみ）
	testUsers := cognito.GetTestUsers()
	assert.Len(t, testUsers, 3, "事前定義テストユーザーの数が正しくありません")
	assert.Equal(t, "admin@test.com", testUsers[0].Email, "管理者ユーザーのメールアドレスが正しくありません")
	assert.Equal(t, model.Role(1), testUsers[0].Role, "管理者ユーザーのロールが正しくありません")
	assert.Equal(t, "manager@test.com", testUsers[1].Email, "マネージャーユーザーのメールアドレスが正しくありません")
	assert.Equal(t, model.Role(3), testUsers[1].Role, "マネージャーユーザーのロールが正しくありません")
	assert.Equal(t, "employee@test.com", testUsers[2].Email, "従業員ユーザーのメールアドレスが正しくありません")
	assert.Equal(t, model.Role(4), testUsers[2].Role, "従業員ユーザーのロールが正しくありません")
}
