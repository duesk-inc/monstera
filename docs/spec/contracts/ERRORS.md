# Common Error Specification

version: 0.1.0
status: draft
owner: BE/FE shared

## Envelope
- All error responses SHOULD follow this envelope:
  ```json
  {
    "code": "string",        // machine-readable error code (snake_case)
    "message": "string",     // human-readable message (ja-JP)
    "errors": {               // optional field-level validation errors
      "field_name": "reason"
    }
  }
  ```

## HTTP ↔ code mapping (baseline)
- 400 Bad Request
  - `code`: `validation_error` (with per-field errors) or a specific code
- 401 Unauthorized
  - `code`: `unauthorized`
- 403 Forbidden
  - `code`: `forbidden`
- 404 Not Found
  - `code`: `not_found`
- 409 Conflict
  - `code`: `version_conflict` (optimistic lock) or domain-specific
- 500 Internal Server Error
  - `code`: `internal_error`

## Examples
- Validation error (400)
  ```json
  {
    "code": "validation_error",
    "message": "入力内容に誤りがあります",
    "errors": {
      "project_name": "1文字以上200文字以内で入力してください",
      "start_date": "日付形式が不正です"
    }
  }
  ```

- Not found (404)
  ```json
  {
    "code": "not_found",
    "message": "対象が見つかりません"
  }
  ```

- Forbidden (403)
  ```json
  {
    "code": "forbidden",
    "message": "操作の権限がありません"
  }
  ```

## Notes
- Backend may keep internal constants but SHOULD map to the common envelope at the handler boundary.
- Frontend error handler consumes `code/message/errors` to render unified UI.

