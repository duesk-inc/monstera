import React from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  FormHelperText,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

interface ReceiptUploadProps {
  receiptFile: File | null;
  onFileChange: (file: File | null) => void;
  onError: (message: string) => void;
  required?: boolean;
}

/**
 * 領収書アップロードコンポーネント
 * ファイル選択、バリデーション、表示、削除を管理
 */
export const ReceiptUpload: React.FC<ReceiptUploadProps> = ({
  receiptFile,
  onFileChange,
  onError,
  required = true,
}) => {
  // ファイル添付ハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // ファイルサイズチェック（5MB以内）
    if (file.size > 5 * 1024 * 1024) {
      onError(`${file.name} は5MBを超えています`);
      return;
    }
    
    // 許可されたファイル形式チェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      onError('許可されているファイル形式は .jpg, .png, .gif, .pdf のみです');
      return;
    }
    
    onFileChange(file);
  };
  
  // ファイル削除ハンドラー
  const handleRemoveFile = () => {
    onFileChange(null);
  };

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        領収書 {required && <Typography component="span" color="error">*</Typography>}
      </Typography>
      
      {receiptFile ? (
        <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon color="primary" />
            <Typography>{receiptFile.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              ({(receiptFile.size / 1024).toFixed(1)} KB)
            </Typography>
          </Box>
          <IconButton onClick={handleRemoveFile} size="small">
            <CloseIcon />
          </IconButton>
        </Paper>
      ) : (
        <Box>
          <input
            accept="image/*,.pdf"
            style={{ display: 'none' }}
            id="receipt-file-input"
            type="file"
            onChange={handleFileChange}
          />
          <label htmlFor="receipt-file-input">
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                border: '2px dashed',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
            >
              <AttachFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" gutterBottom>
                領収書をアップロード
              </Typography>
              <Typography variant="caption" color="text.secondary">
                JPG, PNG, GIF, PDF (最大5MB)
              </Typography>
            </Paper>
          </label>
          {required && (
            <FormHelperText error>
              領収書の添付は必須です
            </FormHelperText>
          )}
        </Box>
      )}
    </Box>
  );
}; 