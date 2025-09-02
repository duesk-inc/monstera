import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { generateUploadURL, completeUpload, deleteUploadedFile } from '@/lib/api/expense';
import type { UploadFileRequest, UploadFileResponse, UploadProgress } from '@/types/expense';
import { useEnhancedErrorHandler } from '@/hooks/common/useEnhancedErrorHandler';
import { useToast } from '@/components/common/Toast';
import { UPLOAD_CONSTANTS, EXPENSE_MESSAGES } from '@/constants/expense';

// プログレス更新間隔（ミリ秒）
const PROGRESS_UPDATE_INTERVAL = 100;
// 最大ファイルサイズ（バイト）
const MAX_FILE_SIZE = UPLOAD_CONSTANTS.MAX_FILE_SIZE;
// 許可されるMIMEタイプ
const ALLOWED_MIME_TYPES = UPLOAD_CONSTANTS.ALLOWED_TYPES;
// UI定数
const ICON_SIZE = 48;
const ICON_SIZE_SMALL = 20;
const SUCCESS_DELAY = 1000;
const ERROR_DELAY = 3000;
const HTTP_OK = 200;

interface ReceiptUploaderProps {
  value?: string; // アップロード済みファイルのURL
  s3Key?: string; // S3キー
  fileName?: string; // アップロード済みファイルの名前
  onChange: (url: string | null, s3Key: string | null, fileName?: string | null) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
}

/**
 * 領収書アップローダーコンポーネント
 * S3への直接アップロード、プログレス表示、ファイル管理を提供
 */
export const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({
  value,
  s3Key,
  fileName,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
}) => {
  const { handleSubmissionError } = useEnhancedErrorHandler();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // アップロード状態
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ファイル削除処理
  const handleDelete = useCallback(async () => {
    if (!s3Key) return;
    
    try {
      await deleteUploadedFile({ s3_key: s3Key });
      onChange(null, null, null);
      showSuccess('ファイルを削除しました');
    } catch (error) {
      handleSubmissionError(error, 'ファイルの削除');
    }
  }, [s3Key, onChange, showSuccess, handleSubmissionError]);

  // ファイルバリデーション
  const validateFile = useCallback((file: File): string | null => {
    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      return `ファイルサイズは${(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB以下にしてください`;
    }
    
    // MIMEタイプチェック
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'JPG、PNG、PDFファイルのみアップロード可能です';
    }
    
    return null;
  }, []);

  // S3アップロード処理
  const uploadToS3 = useCallback(async (file: File, uploadUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // プログレス更新
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => prev ? { ...prev, progress } : null);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === HTTP_OK) {
          resolve();
        } else {
          reject(new Error(`アップロードに失敗しました: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('アップロードエラーが発生しました'));
      };
      
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }, []);

  // ファイルアップロード処理
  const handleFileUpload = useCallback(async (file: File) => {
    // バリデーション
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    try {
      // アップロード状態を初期化
      setUploadProgress({
        file,
        progress: 0,
        status: 'pending',
      });

      // Pre-signed URL取得
      const uploadRequest: UploadFileRequest = {
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      };

      const uploadResponse: UploadFileResponse = await generateUploadURL(uploadRequest);
      
      setUploadProgress(prev => prev ? { 
        ...prev, 
        status: 'uploading',
        uploadUrl: uploadResponse.uploadUrl,
        s3Key: uploadResponse.s3Key,
      } : null);

      // S3にアップロード
      await uploadToS3(file, uploadResponse.uploadUrl);

      setUploadProgress(prev => prev ? { 
        ...prev, 
        status: 'completed',
        progress: 100,
      } : null);

      // アップロード完了通知
      const completeResponse = await completeUpload({
        s3_key: uploadResponse.s3Key,
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      });

      // 成功時の処理（公開URLとS3キーは完了レスポンスから使用）
      onChange(completeResponse.receiptUrl, completeResponse.s3Key, file.name);
      showSuccess(EXPENSE_MESSAGES.UPLOAD_SUCCESS);
      
      // プログレス状態をクリア
      setTimeout(() => setUploadProgress(null), SUCCESS_DELAY);

    } catch (error) {
      setUploadProgress(prev => prev ? { 
        ...prev, 
        status: 'error',
        error: error instanceof Error ? error.message : 'アップロードに失敗しました',
      } : null);
      
      handleSubmissionError(error, 'ファイルのアップロード');
      
      // エラー状態を一定時間後にクリア
      setTimeout(() => setUploadProgress(null), ERROR_DELAY);
    }
  }, [validateFile, uploadToS3, onChange, showSuccess, showError, handleSubmissionError]);

  // ファイル選択処理
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
    // input要素をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileUpload]);

  // ドラッグ&ドロップ処理
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    if (disabled) return;
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [disabled, handleFileUpload]);

  // ファイル選択ボタンクリック
  const handleButtonClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  // アップロード中の表示
  if (uploadProgress) {
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          領収書 {required && <Typography component="span" color="error">*</Typography>}
        </Typography>
        
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            {uploadProgress.status === 'uploading' && <CircularProgress size={ICON_SIZE_SMALL} />}
            {uploadProgress.status === 'completed' && <CheckCircleIcon color="success" />}
            {uploadProgress.status === 'error' && <ErrorIcon color="error" />}
            
            <Typography variant="body2">
              {uploadProgress.file.name}
            </Typography>
            
            <Chip 
              label={uploadProgress.status === 'uploading' ? 'アップロード中' : 
                    uploadProgress.status === 'completed' ? '完了' : 'エラー'}
              color={uploadProgress.status === 'uploading' ? 'info' : 
                     uploadProgress.status === 'completed' ? 'success' : 'error'}
              size="small"
            />
          </Box>
          
          {uploadProgress.status === 'uploading' && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={uploadProgress.progress} 
                sx={{ flexGrow: 1 }}
              />
              <Typography variant="caption">
                {uploadProgress.progress}%
              </Typography>
            </Box>
          )}
          
          {uploadProgress.status === 'error' && uploadProgress.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {uploadProgress.error}
            </Alert>
          )}
        </Paper>
      </Box>
    );
  }

  // ファイル名から表示用の名前を生成（長い場合は省略）
  const getDisplayFileName = (name: string | undefined): string => {
    if (!name) {
      // ファイル名がない場合はURLから推測
      if (value) {
        try {
          const url = new URL(value);
          const pathSegments = url.pathname.split('/');
          const encodedName = pathSegments[pathSegments.length - 1] || 'ファイル';
          // URLエンコードされた日本語ファイル名をデコード
          name = decodeURIComponent(encodedName);
        } catch {
          name = 'ファイル';
        }
      } else {
        return 'ファイル';
      }
    }
    
    // S3等でタイムスタンプが付与されている場合は除去
    // 形式: 1234567890_originalfilename.ext -> originalfilename.ext
    const timestampPattern = /^\d{10}_/;
    if (timestampPattern.test(name)) {
      name = name.replace(timestampPattern, '');
    }
    
    // 拡張子を分離
    const lastDotIndex = name.lastIndexOf('.');
    const nameWithoutExt = lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
    const extension = lastDotIndex > 0 ? name.substring(lastDotIndex) : '';
    
    // ファイル名が長すぎる場合は省略（日本語文字も考慮）
    const maxLength = 60;  // 表示領域を最大限活用するため大きく設定
    if (name.length > maxLength) {
      const truncatedName = nameWithoutExt.length > (maxLength - extension.length - 3) 
        ? nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...' 
        : nameWithoutExt;
      return truncatedName + extension;
    }
    
    return name;
  };

  // アップロード済みファイルの表示
  if (value && s3Key) {
    const displayFileName = getDisplayFileName(fileName);
    
    return (
      <Box>
        <Typography variant="subtitle1" gutterBottom>
          領収書 {required && <Typography component="span" color="error">*</Typography>}
        </Typography>
        
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon color="success" sx={{ flexShrink: 0, mr: 0.5 }} />
            <Typography 
              variant="body2" 
              component="a"
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: '1 1 auto',
                minWidth: 0,  // オーバーフローが正しく動作するように
                maxWidth: 'calc(100% - 60px)',  // アイコン分を除いた最大幅
                textDecoration: 'none',
                color: 'primary.main',
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                }
              }}
              title={fileName || displayFileName}
            >
              {displayFileName}
            </Typography>
            <IconButton
              size="small"
              onClick={handleDelete}
              disabled={disabled}
              title="ファイルを削除"
              sx={{ flexShrink: 0, ml: 'auto' }}
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Paper>
      </Box>
    );
  }

  // アップロード領域の表示
  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom>
        領収書 {required && <Typography component="span" color="error">*</Typography>}
      </Typography>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={handleFileSelect}
        disabled={disabled}
      />
      
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          border: '2px dashed',
          borderColor: error ? 'error.main' : isDragOver ? 'primary.main' : 'divider',
          bgcolor: isDragOver ? 'action.hover' : 'transparent',
          opacity: disabled ? 0.6 : 1,
          '&:hover': {
            borderColor: disabled ? 'divider' : 'primary.main',
            bgcolor: disabled ? 'transparent' : 'action.hover',
          },
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={disabled ? undefined : handleButtonClick}
      >
        <CloudUploadIcon 
          sx={{ 
            fontSize: ICON_SIZE, 
            color: error ? 'error.main' : 'text.secondary', 
            mb: 1 
          }} 
        />
        <Typography variant="body1" gutterBottom>
          ファイルをドラッグ&ドロップまたは
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AttachFileIcon />}
          onClick={(e) => {
            e.stopPropagation();
            handleButtonClick();
          }}
          disabled={disabled}
          sx={{ mb: 1 }}
        >
          ファイルを選択
        </Button>
        <Typography variant="caption" color="text.secondary" display="block">
          JPG、PNG、PDF（最大{(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB）
        </Typography>
      </Paper>
      
      {error && (
        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
      
      {helperText && !error && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {helperText}
        </Typography>
      )}
    </Box>
  );
};
