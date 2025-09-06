package mapping

import (
    "fmt"

    "github.com/duesk/monstera/internal/model"
)

// MapFEToBEStatus FEの状態('draft'|'active'|'archived')をBEのProjectStatusへ変換
func MapFEToBEStatus(fe string) (model.ProjectStatus, error) {
    switch fe {
    case "draft":
        return model.ProjectStatusProposal, nil
    case "active":
        return model.ProjectStatusActive, nil
    case "archived":
        return model.ProjectStatusClosed, nil
    case "":
        // デフォルト（未指定時）
        return model.ProjectStatusProposal, nil
    default:
        return "", fmt.Errorf("invalid status: %s", fe)
    }
}

// MapBEToFEStatus BEのProjectStatusをFEの状態へ変換
func MapBEToFEStatus(be model.ProjectStatus) string {
    switch be {
    case model.ProjectStatusProposal:
        return "draft"
    case model.ProjectStatusActive:
        return "active"
    case model.ProjectStatusClosed:
        return "archived"
    default:
        // FE v0ではその他の状態は公開しない
        return "draft"
    }
}

