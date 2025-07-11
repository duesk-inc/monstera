package service

import (
	"bufio"
	"fmt"
	"io"
	"net"
	"strings"
	"time"
)

// ClamAVEngine ClamAVを使用したスキャンエンジン
type ClamAVEngine struct {
	host        string
	port        int
	timeout     time.Duration
	maxScanSize int64
}

// NewClamAVEngine ClamAVエンジンのインスタンスを生成
func NewClamAVEngine(host string, port int, timeout time.Duration, maxScanSize int64) ScanEngine {
	return &ClamAVEngine{
		host:        host,
		port:        port,
		timeout:     timeout,
		maxScanSize: maxScanSize,
	}
}

// Scan ストリームをスキャン
func (e *ClamAVEngine) Scan(reader io.Reader) (bool, string, error) {
	// ClamAVデーモンに接続
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", e.host, e.port), e.timeout)
	if err != nil {
		return false, "", fmt.Errorf("failed to connect to ClamAV: %w", err)
	}
	defer conn.Close()

	// INSTREAMコマンドを送信
	_, err = conn.Write([]byte("zINSTREAM\x00"))
	if err != nil {
		return false, "", fmt.Errorf("failed to send INSTREAM command: %w", err)
	}

	// データをストリーミング
	buf := make([]byte, 4096)
	totalSize := int64(0)

	for {
		n, err := reader.Read(buf)
		if err != nil && err != io.EOF {
			return false, "", fmt.Errorf("failed to read data: %w", err)
		}

		if n == 0 {
			break
		}

		totalSize += int64(n)
		if totalSize > e.maxScanSize {
			return false, "", fmt.Errorf("file size exceeds maximum scan size")
		}

		// チャンクサイズを送信（ネットワークバイトオーダー）
		chunkSize := []byte{
			byte(n >> 24),
			byte(n >> 16),
			byte(n >> 8),
			byte(n),
		}

		_, err = conn.Write(chunkSize)
		if err != nil {
			return false, "", fmt.Errorf("failed to write chunk size: %w", err)
		}

		// データを送信
		_, err = conn.Write(buf[:n])
		if err != nil {
			return false, "", fmt.Errorf("failed to write data: %w", err)
		}
	}

	// ストリーム終了を通知
	_, err = conn.Write([]byte{0, 0, 0, 0})
	if err != nil {
		return false, "", fmt.Errorf("failed to send end of stream: %w", err)
	}

	// 結果を読み取り
	scanner := bufio.NewScanner(conn)
	if scanner.Scan() {
		result := scanner.Text()
		return e.parseResult(result)
	}

	return false, "", fmt.Errorf("failed to read scan result")
}

// ScanFile ファイルパスでスキャン
func (e *ClamAVEngine) ScanFile(filePath string) (bool, string, error) {
	// ClamAVデーモンに接続
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", e.host, e.port), e.timeout)
	if err != nil {
		return false, "", fmt.Errorf("failed to connect to ClamAV: %w", err)
	}
	defer conn.Close()

	// SCANコマンドを送信
	command := fmt.Sprintf("zSCAN %s\x00", filePath)
	_, err = conn.Write([]byte(command))
	if err != nil {
		return false, "", fmt.Errorf("failed to send SCAN command: %w", err)
	}

	// 結果を読み取り
	scanner := bufio.NewScanner(conn)
	if scanner.Scan() {
		result := scanner.Text()
		return e.parseResult(result)
	}

	return false, "", fmt.Errorf("failed to read scan result")
}

// GetEngineInfo エンジン情報を取得
func (e *ClamAVEngine) GetEngineInfo() (string, string) {
	// バージョン情報を取得
	version := "unknown"

	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", e.host, e.port), e.timeout)
	if err == nil {
		defer conn.Close()

		_, err = conn.Write([]byte("zVERSION\x00"))
		if err == nil {
			scanner := bufio.NewScanner(conn)
			if scanner.Scan() {
				version = scanner.Text()
			}
		}
	}

	return "ClamAV", version
}

// UpdateDefinitions ウイルス定義を更新
func (e *ClamAVEngine) UpdateDefinitions() error {
	// ClamAVの定義更新は通常freshclamで行われるため、
	// ここでは更新リクエストのみを記録
	conn, err := net.DialTimeout("tcp", fmt.Sprintf("%s:%d", e.host, e.port), e.timeout)
	if err != nil {
		return fmt.Errorf("failed to connect to ClamAV: %w", err)
	}
	defer conn.Close()

	// RELOADコマンドを送信（定義の再読み込み）
	_, err = conn.Write([]byte("zRELOAD\x00"))
	if err != nil {
		return fmt.Errorf("failed to send RELOAD command: %w", err)
	}

	return nil
}

// parseResult ClamAVの結果を解析
func (e *ClamAVEngine) parseResult(result string) (bool, string, error) {
	// 結果の形式: "stream: OK" または "stream: Virus.Name FOUND"
	result = strings.TrimSpace(result)

	if strings.HasSuffix(result, "OK") {
		return true, "", nil
	}

	if strings.Contains(result, "FOUND") {
		// ウイルス名を抽出
		parts := strings.Split(result, ":")
		if len(parts) >= 2 {
			virusInfo := strings.TrimSpace(parts[1])
			virusParts := strings.Split(virusInfo, " ")
			if len(virusParts) >= 1 {
				return false, virusParts[0], nil
			}
		}
		return false, "Unknown virus", nil
	}

	// エラーケース
	if strings.Contains(result, "ERROR") {
		return false, "", fmt.Errorf("ClamAV error: %s", result)
	}

	return false, "", fmt.Errorf("unexpected result: %s", result)
}
