# Storage (S3/MinIO Presigned) Contract

version: 0.1.0
status: draft
owner: BE/FE shared

## Overview
Single-receipt upload flow for expenses using presigned URLs. Implemented via `S3Service` and expense handler endpoints.

## Flow
1) FE requests presigned URL
   - POST `/api/v1/expenses/upload-url`
   - Req: { file_name, file_size, content_type }
   - Resp: { upload_url, s3_key, expires_at }
2) FE uploads file via PUT to `upload_url` (Content-Type set to file MIME)
3) FE notifies upload completion
   - POST `/api/v1/expenses/upload-complete`
   - Req: { s3_key, file_name, file_size, content_type }
   - Resp: { receipt_url, s3_key, uploaded_at }
4) Optional delete
   - DELETE `/api/v1/expenses/upload` with body { s3_key }

## Constraints (proposed defaults)
- Max size: 10MB
- Allowed MIME: image/jpeg, image/png, image/gif, image/webp, application/pdf
- URL expiry: 15 minutes

## Errors
- 400 invalid file (size/type)
- 401/403 auth/role
- 500 on generation/completion failures

