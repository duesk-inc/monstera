import React from 'react';
import { Box, Alert, Chip, Typography } from '@mui/material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { SkillSheet, SkillSheetFormData } from '@/types/skillSheet';
import { PageHeader } from '@/components/common/layout';

interface SkillSheetHeaderProps {
  isSubmitting: boolean;
  skillSheet: SkillSheet | null;
  formData: SkillSheetFormData;
  onTempSave: () => void;
  onSubmit: () => void;
  isTempSaved: boolean;
  tempSavedAt: Date | null;
  isDirty?: boolean;
}

/**
 * スキルシートページのヘッダーコンポーネント
 */
export const SkillSheetHeader: React.FC<SkillSheetHeaderProps> = ({
  isSubmitting,
  skillSheet,
  formData,
  onTempSave,
  onSubmit,
  isTempSaved,
  tempSavedAt,
  isDirty = true,
}) => {
  // 一時保存日時のフォーマット
  const formattedTempSavedAt = tempSavedAt
    ? format(tempSavedAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })
    : '';

  // 職務経歴の件数を取得
  const workHistoryCount = formData.workHistory?.length || 0;
  
  // ステータス情報の構築
  const subtitle = skillSheet 
    ? `${skillSheet.lastName} ${skillSheet.firstName} さんの職務経歴・技術スキル・プロジェクト実績`
    : '職務経歴・技術スキル・プロジェクト実績を管理します';
  
  // ヘッダーアクションの構築
  const headerActions = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {/* ステータスチップ */}
      <Chip
        label={`職務経歴 ${workHistoryCount}件`}
        size="small"
        variant="outlined"
        sx={{
          borderColor: 'primary.main',
          color: 'primary.main',
          backgroundColor: 'background.paper',
        }}
      />
      
      {/* 個別保存モードの表示 */}
      <Chip
        label="個別保存モード"
        size="small"
        color="success"
        variant="filled"
        sx={{
          fontWeight: 600,
        }}
      />
    </Box>
  );

  return (
    <>
      <PageHeader
        title="スキルシート"
        subtitle={subtitle}
        actions={headerActions}
        marginBottom={isTempSaved ? 1 : 3}
        data-testid="skill-sheet-header"
      />
      
      {/* 一時保存状態の表示 */}
      {isTempSaved && (
        <Alert 
          severity="warning" 
          sx={{ 
            mb: 3,
            borderRadius: 1,
            '& .MuiAlert-icon': {
              color: 'warning.main'
            }
          }}
          data-testid="temp-save-alert"
        >
          このスキルシートは一時保存状態です（{formattedTempSavedAt}）。内容を確認し、「更新する」ボタンを押して更新を完了してください。
        </Alert>
      )}
    </>
  );
};