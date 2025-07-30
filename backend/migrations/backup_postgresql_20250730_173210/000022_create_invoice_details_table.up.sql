-- 請求明細テーブルの作成
CREATE TABLE IF NOT EXISTS invoice_details (
  id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci PRIMARY KEY,
  invoice_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '請求書ID',
  project_assignment_id VARCHAR(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'エンジニア案件アサインID',
  description VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '明細内容',
  quantity DECIMAL(10, 2) DEFAULT 1 COMMENT '数量',
  unit_price DECIMAL(10, 2) NOT NULL COMMENT '単価',
  amount DECIMAL(10, 2) NOT NULL COMMENT '金額',
  sort_order INT DEFAULT 0 COMMENT '表示順',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '作成日時',
  updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新日時',
  deleted_at DATETIME(3) NULL COMMENT '削除日時',
  CONSTRAINT fk_invoice_details_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  CONSTRAINT fk_invoice_details_assignment FOREIGN KEY (project_assignment_id) REFERENCES project_assignments(id),
  INDEX idx_invoice_details_invoice_id (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='請求明細テーブル';