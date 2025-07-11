package service

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

// MockScanEngine モックスキャンエンジン
type MockScanEngine struct {
	mock.Mock
}

func (m *MockScanEngine) Scan(reader io.Reader) (bool, string, error) {
	args := m.Called(reader)
	return args.Bool(0), args.String(1), args.Error(2)
}

func (m *MockScanEngine) ScanFile(filePath string) (bool, string, error) {
	args := m.Called(filePath)
	return args.Bool(0), args.String(1), args.Error(2)
}

func (m *MockScanEngine) GetEngineInfo() (string, string) {
	args := m.Called()
	return args.String(0), args.String(1)
}

func (m *MockScanEngine) UpdateDefinitions() error {
	args := m.Called()
	return args.Error(0)
}

func TestVirusScanService_ScanFile_Clean(t *testing.T) {
	// モックの準備
	mockEngine := new(MockScanEngine)
	logger := zap.NewNop()

	service := NewVirusScanService(logger, mockEngine, "/tmp/quarantine", 1024*1024*100)

	// テストデータ
	fileID := uuid.New()
	fileName := "test.pdf"
	fileContent := strings.NewReader("This is a clean file")

	// モックの設定
	mockEngine.On("GetEngineInfo").Return("TestEngine", "1.0.0")
	mockEngine.On("Scan", mock.Anything).Return(true, "", nil)

	// 実行
	result, err := service.ScanFile(context.Background(), fileID, fileName, fileContent)

	// 検証
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, fileID, result.FileID)
	assert.Equal(t, fileName, result.FileName)
	assert.Equal(t, "clean", result.ScanStatus)
	assert.Empty(t, result.VirusName)
	assert.Equal(t, "TestEngine", result.ScanEngine)
	assert.True(t, result.ScanDuration > 0)

	mockEngine.AssertExpectations(t)
}

func TestVirusScanService_ScanFile_Infected(t *testing.T) {
	// モックの準備
	mockEngine := new(MockScanEngine)
	logger := zap.NewNop()

	service := NewVirusScanService(logger, mockEngine, "/tmp/quarantine", 1024*1024*100)

	// テストデータ
	fileID := uuid.New()
	fileName := "malware.exe"
	fileContent := strings.NewReader("This is an infected file")
	virusName := "EICAR-Test-File"

	// モックの設定
	mockEngine.On("GetEngineInfo").Return("TestEngine", "1.0.0")
	mockEngine.On("Scan", mock.Anything).Return(false, virusName, nil)

	// 実行
	result, err := service.ScanFile(context.Background(), fileID, fileName, fileContent)

	// 検証
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, fileID, result.FileID)
	assert.Equal(t, fileName, result.FileName)
	assert.Equal(t, "infected", result.ScanStatus)
	assert.Equal(t, virusName, result.VirusName)
	assert.Equal(t, "TestEngine", result.ScanEngine)

	mockEngine.AssertExpectations(t)
}

func TestVirusScanService_ScanFileByPath(t *testing.T) {
	// モックの準備
	mockEngine := new(MockScanEngine)
	logger := zap.NewNop()

	service := NewVirusScanService(logger, mockEngine, "/tmp/quarantine", 1024*1024*100)

	// テストデータ
	fileID := uuid.New()
	filePath := "/tmp/test.pdf"

	// モックの設定
	mockEngine.On("GetEngineInfo").Return("TestEngine", "1.0.0")
	mockEngine.On("ScanFile", filePath).Return(true, "", nil)

	// 実行
	result, err := service.ScanFileByPath(context.Background(), fileID, filePath)

	// 検証
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, fileID, result.FileID)
	assert.Equal(t, filePath, result.FileName)
	assert.Equal(t, "clean", result.ScanStatus)

	mockEngine.AssertExpectations(t)
}

func TestClamAVEngine_parseResult(t *testing.T) {
	engine := &ClamAVEngine{}

	tests := []struct {
		name      string
		result    string
		wantClean bool
		wantVirus string
		wantErr   bool
	}{
		{
			name:      "クリーンファイル",
			result:    "stream: OK",
			wantClean: true,
			wantVirus: "",
			wantErr:   false,
		},
		{
			name:      "感染ファイル",
			result:    "stream: Eicar-Test-Signature FOUND",
			wantClean: false,
			wantVirus: "Eicar-Test-Signature",
			wantErr:   false,
		},
		{
			name:      "エラー",
			result:    "stream: ERROR: Can't open file",
			wantClean: false,
			wantVirus: "",
			wantErr:   true,
		},
		{
			name:      "予期しない結果",
			result:    "unexpected format",
			wantClean: false,
			wantVirus: "",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isClean, virusName, err := engine.parseResult(tt.result)

			assert.Equal(t, tt.wantClean, isClean)
			assert.Equal(t, tt.wantVirus, virusName)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

// EICARテストファイルのシミュレーション
func TestVirusScanService_EICARTestFile(t *testing.T) {
	// EICARテストファイルの内容（実際のテストでは使用しない）
	// eicarContent := "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"

	// モックの準備
	mockEngine := new(MockScanEngine)
	logger := zap.NewNop()

	service := NewVirusScanService(logger, mockEngine, "/tmp/quarantine", 1024*1024*100)

	// テストデータ
	fileID := uuid.New()
	fileName := "eicar.com"
	fileContent := bytes.NewReader([]byte("simulated eicar content"))

	// モックの設定
	mockEngine.On("GetEngineInfo").Return("TestEngine", "1.0.0")
	mockEngine.On("Scan", mock.Anything).Return(false, "EICAR-Test-File", nil)

	// 実行
	result, err := service.ScanFile(context.Background(), fileID, fileName, fileContent)

	// 検証
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "infected", result.ScanStatus)
	assert.Equal(t, "EICAR-Test-File", result.VirusName)

	mockEngine.AssertExpectations(t)
}
