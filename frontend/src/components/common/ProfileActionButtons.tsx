import React from 'react';
import { Typography, Box } from '@mui/material';
import { SaveAlt as SaveAltIcon, Update as UpdateIcon } from '@mui/icons-material';
import ActionButton from '@/components/common/ActionButton';

interface ProfileActionButtonsProps {
  onTempSave: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isTempSaved: boolean;
  variant?: 'header' | 'footer';
  isDirty?: boolean;
}

/**
 * プロフィール用の共通アクションボタンコンポーネント
 * ヘッダーとフッターで共通的に使用される一時保存・更新ボタン
 */
export const ProfileActionButtons: React.FC<ProfileActionButtonsProps> = ({
  onTempSave,
  onSubmit,
  isSubmitting,
  isTempSaved,
  variant = 'footer',
  isDirty = true // デフォルトはtrueにして互換性を保つ
}) => {
  if (variant === 'header') {
    return (
      <>
        <ActionButton
          onClick={onTempSave}
          buttonType="save"
          icon={<SaveAltIcon />}
          disabled={isSubmitting || !isDirty}
          sx={{ mr: 2 }}
        >
          一時保存
        </ActionButton>
        
        <ActionButton
          onClick={onSubmit}
          buttonType="primary"
          icon={<UpdateIcon />}
          loading={isSubmitting}
          disabled={isSubmitting || !isDirty}
        >
          更新する
        </ActionButton>
      </>
    );
  }

  // footer variant
  return (
    <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
      {isTempSaved && (
        <Typography variant="body2" color="text.secondary">
          一時保存済み
        </Typography>
      )}
      <ActionButton
        buttonType="save"
        onClick={onTempSave}
        disabled={isSubmitting || !isDirty}
        loading={isSubmitting}
        icon={<SaveAltIcon />}
      >
        一時保存
      </ActionButton>
      <ActionButton
        buttonType="primary"
        onClick={onSubmit}
        disabled={isSubmitting || !isDirty}
        loading={isSubmitting}
        icon={<UpdateIcon />}
      >
        更新する
      </ActionButton>
    </Box>
  );
}; 