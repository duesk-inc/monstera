import React, { useState } from 'react';
import {
  Button,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PictureAsPdf as PdfIcon,
  CalendarToday as DateIcon,
  AccountCircle as PersonIcon,
  Settings as SettingsIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useToast } from '../../../hooks/common/useToast';
import type { PDFExportParams } from '../../../types/workHistory';

const StyledButton = styled(Button)(({ theme }) => ({
  gap: theme.spacing(1),
}));

const OptionSection = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
}));

const OptionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(1),
}));

interface WorkHistoryPDFButtonProps {
  onDownload: (params?: PDFExportParams) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'button' | 'icon' | 'menu';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'default';
  label?: string;
  fullWidth?: boolean;
  hasData?: boolean;
  userId?: string; // 管理者用
}

export const WorkHistoryPDFButton: React.FC<WorkHistoryPDFButtonProps> = ({
  onDownload,
  isLoading = false,
  disabled = false,
  variant = 'button',
  size = 'medium',
  color = 'primary',
  label = 'PDF出力',
  fullWidth = false,
  hasData = true,
  userId,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { showSuccess, showError } = useToast();
  
  // PDF出力オプション
  const [options, setOptions] = useState<PDFExportParams>({
    includePersonalInfo: true,
    includeProjects: true,
    includeSkills: true,
    includeSummary: true,
    dateFormat: 'yyyy年MM月',
    startDate: undefined,
    endDate: undefined,
  });

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOptionsOpen = () => {
    handleMenuClose();
    setOptionsOpen(true);
  };

  const handleOptionsClose = () => {
    setOptionsOpen(false);
  };

  const handleDownload = async (withOptions = false) => {
    handleMenuClose();
    
    if (!hasData) {
      showError('出力する職務経歴データがありません');
      return;
    }

    try {
      setDownloading(true);
      
      const params = withOptions ? options : undefined;
      await onDownload(params);
      
      showSuccess('PDFファイルをダウンロードしました');
    } catch (error) {
      console.error('PDF download error:', error);
      showError('PDFファイルのダウンロードに失敗しました');
    } finally {
      setDownloading(false);
      setOptionsOpen(false);
    }
  };

  const handleQuickDownload = () => {
    handleDownload(false);
  };

  const handleCustomDownload = () => {
    handleDownload(true);
  };

  const handleOptionChange = (field: keyof PDFExportParams, value: unknown) => {
    setOptions(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const renderButton = () => {
    const isDisabled = disabled || isLoading || downloading || !hasData;
    
    switch (variant) {
      case 'icon':
        return (
          <Tooltip title={hasData ? label : 'データがありません'}>
            <span>
              <IconButton
                onClick={handleMenuOpen}
                disabled={isDisabled}
                color={color}
                size={size}
              >
                {downloading ? (
                  <CircularProgress size={20} />
                ) : (
                  <PdfIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        );
      
      case 'menu':
        return (
          <MenuItem
            onClick={handleMenuOpen}
            disabled={isDisabled}
          >
            <ListItemIcon>
              {downloading ? (
                <CircularProgress size={20} />
              ) : (
                <PdfIcon />
              )}
            </ListItemIcon>
            <ListItemText primary={label} />
          </MenuItem>
        );
      
      default:
        return (
          <StyledButton
            onClick={handleMenuOpen}
            disabled={isDisabled}
            variant="contained"
            color={color}
            size={size}
            fullWidth={fullWidth}
            startIcon={downloading ? <CircularProgress size={20} /> : <DownloadIcon />}
          >
            {label}
          </StyledButton>
        );
    }
  };

  return (
    <>
      {renderButton()}

      {/* ダウンロードメニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleQuickDownload} disabled={downloading}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="すぐにダウンロード"
            secondary="すべての項目を含むPDFを出力"
          />
        </MenuItem>
        
        <MenuItem onClick={handleOptionsOpen} disabled={downloading}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="オプションを指定してダウンロード"
            secondary="出力内容をカスタマイズ"
          />
        </MenuItem>
      </Menu>

      {/* オプションダイアログ */}
      <Dialog
        open={optionsOpen}
        onClose={handleOptionsClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PdfIcon />
            PDF出力オプション
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <OptionSection>
            <OptionTitle variant="subtitle1">
              出力内容
            </OptionTitle>
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includePersonalInfo}
                  onChange={(e) => handleOptionChange('includePersonalInfo', e.target.checked)}
                />
              }
              label="個人情報を含める（氏名、メールアドレス等）"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeProjects}
                  onChange={(e) => handleOptionChange('includeProjects', e.target.checked)}
                />
              }
              label="プロジェクト詳細を含める"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeSkills}
                  onChange={(e) => handleOptionChange('includeSkills', e.target.checked)}
                />
              }
              label="技術スキル一覧を含める"
            />
            
            <FormControlLabel
              control={
                <Checkbox
                  checked={options.includeSummary}
                  onChange={(e) => handleOptionChange('includeSummary', e.target.checked)}
                />
              }
              label="サマリー情報を含める（経験年数、統計等）"
            />
          </OptionSection>

          <OptionSection>
            <OptionTitle variant="subtitle1">
              期間指定
            </OptionTitle>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              特定期間のプロジェクトのみを出力する場合に指定してください
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <FormControl fullWidth>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  開始日
                </Typography>
                <input
                  type="month"
                  value={options.startDate || ''}
                  onChange={(e) => handleOptionChange('startDate', e.target.value || undefined)}
                  style={{ 
                    padding: '8px', 
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </FormControl>
              
              <FormControl fullWidth>
                <Typography variant="caption" color="text.secondary" gutterBottom>
                  終了日
                </Typography>
                <input
                  type="month"
                  value={options.endDate || ''}
                  onChange={(e) => handleOptionChange('endDate', e.target.value || undefined)}
                  style={{ 
                    padding: '8px', 
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                  }}
                />
              </FormControl>
            </Box>
          </OptionSection>

          {userId && (
            <Alert severity="info" icon={<PersonIcon />}>
              <Typography variant="body2">
                {`エンジニアID: ${userId} の職務経歴書を出力します`}
              </Typography>
            </Alert>
          )}

          {!hasData && (
            <Alert severity="warning" icon={<WarningIcon />}>
              <Typography variant="body2">
                出力可能な職務経歴データがありません。
                先に職務経歴を登録してください。
              </Typography>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleOptionsClose} disabled={downloading}>
            キャンセル
          </Button>
          <Button
            onClick={handleCustomDownload}
            variant="contained"
            disabled={downloading || !hasData}
            startIcon={downloading ? <CircularProgress size={16} /> : <DownloadIcon />}
          >
            ダウンロード
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default WorkHistoryPDFButton;