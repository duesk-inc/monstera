# Profile & Skill Sheet API Contract

version: 0.1.0
status: draft
owner: BE/FE shared

## Overview
Skill Sheet endpoints for engineer users. DTOs reflect `backend/internal/dto/skill_sheet_dto.go` and `backend/internal/dto/profile_dto.go`.

## Endpoints
- GET `/api/v1/skill-sheet`
  - Auth: engineer
  - Resp: `SkillSheetResponse`
- PUT `/api/v1/skill-sheet`
  - Auth: engineer
  - Req: `SkillSheetSaveRequest`
  - Resp: `{ message: string }`
- POST `/api/v1/skill-sheet/temp-save`
  - Auth: engineer
  - Req: `SkillSheetTempSaveRequest`
  - Resp: `{ message: string }`

## DTOs
- SkillSheetResponse
  - user_id: string
  - email: string
  - first_name, last_name: string
  - first_name_kana, last_name_kana: string
  - work_histories: WorkHistoryResponse[]
  - technical_skills: TechnicalSkillResponse[]
  - created_at, updated_at: string (ISO8601)
- WorkHistoryResponse
  - id: string
  - project_name: string
  - start_date: string (YYYY-MM-DD)
  - end_date: string | null
  - industry: number
  - project_overview, responsibilities, achievements, notes: string
  - processes: number[]
  - technologies: string
  - programming_languages, servers_databases, tools: string[]
  - technology_items: { id, category_id, technology_name }[]
  - team_size: number
  - role: string
- TechnicalSkillResponse
  - category_id: string
  - category_name: string
  - display_name: string
  - technologies: string[]
- SkillSheetSaveRequest | SkillSheetTempSaveRequest
  - work_history: WorkHistoryRequest[]
- WorkHistoryRequest
  - project_name: string
  - start_date, end_date: string (YYYY-MM-DD)
  - industry: number
  - project_overview, responsibilities, achievements, notes: string
  - processes: number[]
  - technologies: string
  - programming_languages, servers_databases, tools: string[]
  - technology_items: { category_name: string; technology_name: string }[]
  - team_size: number
  - role: string

## Errors
- 401 Unauthorized (missing/invalid auth)
- 400 Bad Request (validation)
- 500 Internal Server Error (service failure)

## Notes
- Field names and arrays align with backend DTOs; FE uses camelCase internally and converts at boundary.

