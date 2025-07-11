package logger

import (
	"fmt"
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// InitLogger ロガーを初期化する
func InitLogger(isProduction bool) (*zap.Logger, error) {
	var config zap.Config

	if isProduction {
		config = zap.NewProductionConfig()
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	// ログレベルを環境変数から設定可能に
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel != "" {
		var level zapcore.Level
		if err := level.UnmarshalText([]byte(logLevel)); err == nil {
			config.Level = zap.NewAtomicLevelAt(level)
		}
	}

	return config.Build()
}

// GetRequestLogger リクエスト固有のフィールドを持つロガーを生成
func GetRequestLogger(logger *zap.Logger, requestID string, userID string) *zap.Logger {
	fields := []zap.Field{
		zap.String("request_id", requestID),
	}

	if userID != "" {
		fields = append(fields, zap.String("user_id", userID))
	}

	return logger.With(fields...)
}

// LogAndWrapError はエラーをログに記録し、メッセージを追加してラップします
func LogAndWrapError(logger *zap.Logger, err error, message string, fields ...zap.Field) error {
	logger.Error(message, append(fields, zap.Error(err))...)
	return fmt.Errorf("%s: %w", message, err)
}

// LogWarn はwarningをログに記録します
func LogWarn(logger *zap.Logger, message string, fields ...zap.Field) {
	logger.Warn(message, fields...)
}

// LogInfo は情報をログに記録します
func LogInfo(logger *zap.Logger, message string, fields ...zap.Field) {
	logger.Info(message, fields...)
}

// LogDebug はデバッグ情報をログに記録します
func LogDebug(logger *zap.Logger, message string, fields ...zap.Field) {
	logger.Debug(message, fields...)
}

// LogError はエラー情報をログに記録します
func LogError(logger *zap.Logger, message string, fields ...zap.Field) {
	logger.Error(message, fields...)
}

// NewNopLogger はno-opロガーを返します
func NewNopLogger() *zap.Logger {
	return zap.NewNop()
}

// EnsureLogger はロガーがnilの場合にno-opロガーを返します
func EnsureLogger(logger *zap.Logger) *zap.Logger {
	if logger == nil {
		return zap.NewNop()
	}
	return logger
}
