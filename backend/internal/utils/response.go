package utils

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// ErrorResponse エラーレスポンスの構造体
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
	Details string `json:"details,omitempty"`
}

// RespondError エラーレスポンスを返す
func RespondError(c *gin.Context, statusCode int, message string, details ...string) {
	response := ErrorResponse{
		Error:   message,
		Message: message,
	}

	// 詳細情報がある場合は追加
	if len(details) > 0 && details[0] != "" {
		response.Details = details[0]
	}

	c.JSON(statusCode, response)
}

// RespondSuccess 成功レスポンスを返す
func RespondSuccess(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, data)
}

// RespondCreated 作成成功レスポンスを返す
func RespondCreated(c *gin.Context, data interface{}) {
	c.JSON(http.StatusCreated, data)
}

// RespondNoContent 内容なしレスポンスを返す
func RespondNoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// RespondBadRequest 不正なリクエストレスポンスを返す
func RespondBadRequest(c *gin.Context, message string) {
	RespondError(c, http.StatusBadRequest, message)
}

// RespondUnauthorized 認証エラーレスポンスを返す
func RespondUnauthorized(c *gin.Context, message string) {
	RespondError(c, http.StatusUnauthorized, message)
}

// RespondForbidden 権限エラーレスポンスを返す
func RespondForbidden(c *gin.Context, message string) {
	RespondError(c, http.StatusForbidden, message)
}

// RespondNotFound 見つからないエラーレスポンスを返す
func RespondNotFound(c *gin.Context, message string) {
	RespondError(c, http.StatusNotFound, message)
}

// RespondInternalServerError サーバーエラーレスポンスを返す
func RespondInternalServerError(c *gin.Context, message string) {
	RespondError(c, http.StatusInternalServerError, message)
}
