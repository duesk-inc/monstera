package model

import (
	"strings"
)

// SplitCSV カンマ区切り文字列を配列に変換
func SplitCSV(csv string) []string {
	if csv == "" {
		return []string{}
	}

	// カンマで分割して各要素をトリム
	items := strings.Split(csv, ",")
	for i, item := range items {
		items[i] = strings.TrimSpace(item)
	}

	return items
}

// JoinCSV 配列をカンマ区切り文字列に変換
func JoinCSV(items []string) string {
	// 空配列は空文字を返す
	if len(items) == 0 {
		return ""
	}

	// 配列要素をカンマで結合
	return strings.Join(items, ",")
}
