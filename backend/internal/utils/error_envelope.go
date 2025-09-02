package utils

import (
    "github.com/gin-gonic/gin"
)

// ErrorEnvelope represents the common API error structure.
// It intentionally matches docs/spec/contracts/ERRORS.md
type ErrorEnvelope struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Errors  map[string]string `json:"errors,omitempty"`
}

// RespondErrorEnvelope writes a standardized error response.
// This helper is intended for new/updated endpoints to gradually adopt
// the common envelope without breaking existing handlers.
func RespondErrorEnvelope(c *gin.Context, httpStatus int, code string, message string, fieldErrors map[string]string) {
    env := ErrorEnvelope{
        Code:    code,
        Message: message,
        Errors:  nil,
    }
    if len(fieldErrors) > 0 {
        env.Errors = fieldErrors
    }
    c.JSON(httpStatus, env)
}

