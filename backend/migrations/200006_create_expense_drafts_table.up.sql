-- 経費申請下書きテーブルの作成
CREATE TABLE IF NOT EXISTS expense_drafts (
    id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL PRIMARY KEY,
    user_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
    data JSON NOT NULL COMMENT '下書きデータ（JSON形式）',
    saved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '保存日時',
    expires_at TIMESTAMP NOT NULL COMMENT '有効期限',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_expense_drafts_user_id (user_id),
    INDEX idx_expense_drafts_expires_at (expires_at),
    INDEX idx_expense_drafts_deleted_at (deleted_at),
    
    CONSTRAINT fk_expense_drafts_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='経費申請下書きテーブル';

-- 有効期限切れの下書きを自動削除するイベント（オプション）
-- 本番環境では別途バッチ処理で実装することを推奨
-- 注意: マイグレーションツールではDELIMITERがサポートされないため
-- イベントは手動で作成するか、アプリケーション側で実装する必要があります