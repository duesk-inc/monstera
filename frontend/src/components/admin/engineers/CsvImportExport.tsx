import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Close as CloseIcon,
  GetApp as GetAppIcon,
} from '@mui/icons-material';
import { useImportEngineersCSV, useEngineerMutations } from '@/hooks/admin/useEngineersQuery';
import { useToast } from '@/components/common/Toast/ToastProvider';
import { EngineerStatus } from '@/types/engineer';
import { ENGINEER_STATUS_LABELS, ENGINEER_STATUS } from '@/constants/engineer';

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{
    row: number;
    message: string;
    data?: Record<string, any>;
  }>;
  warnings: Array<{
    row: number;
    message: string;
  }>;
}

export const CsvImportTab: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportEngineersCSV();
  const { showSuccess, showError } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        showError('CSVファイルを選択してください');
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      showError('ファイルを選択してください');
      return;
    }

    try {
      await importMutation.mutateAsync(file);
      showSuccess('インポート処理を開始しました');
      setImportResult(null);
    } catch (error) {
      console.error('Import failed:', error);
    }
  };

  const handleReset = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        CSVファイルのインポート
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          CSVファイルから複数のエンジニア情報を一括で登録できます。
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          必須項目: メールアドレス、姓、名、姓（英語）、名（英語）、姓（カナ）、名（カナ）
        </Typography>
      </Alert>

      {/* ファイル選択エリア */}
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          textAlign: 'center',
          borderStyle: 'dashed',
          borderWidth: 2,
          backgroundColor: file ? 'action.hover' : 'background.paper',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="csv-file-input"
        />
        <label htmlFor="csv-file-input">
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            disabled={importMutation.isPending}
          >
            ファイルを選択
          </Button>
        </label>
        
        {file && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              選択ファイル: {file.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              サイズ: {(file.size / 1024).toFixed(2)} KB
            </Typography>
          </Box>
        )}
      </Paper>

      {/* アクションボタン */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || importMutation.isPending}
          startIcon={importMutation.isPending ? null : <UploadIcon />}
        >
          {importMutation.isPending ? '処理中...' : 'インポート実行'}
        </Button>
        <Button
          variant="outlined"
          onClick={handleReset}
          disabled={importMutation.isPending}
        >
          リセット
        </Button>
      </Box>

      {/* 処理中表示 */}
      {importMutation.isPending && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            インポート処理中...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* インポート結果 */}
      {importResult && (
        <Box>
          <Typography variant="h6" gutterBottom>
            インポート結果
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip
              icon={<SuccessIcon />}
              label={`成功: ${importResult.success}件`}
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<ErrorIcon />}
              label={`失敗: ${importResult.failed}件`}
              color="error"
              variant="outlined"
            />
            {importResult.warnings.length > 0 && (
              <Chip
                icon={<WarningIcon />}
                label={`警告: ${importResult.warnings.length}件`}
                color="warning"
                variant="outlined"
              />
            )}
          </Box>

          {/* エラー詳細 */}
          {importResult.errors.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                  エラー詳細
                </Typography>
                <Button
                  size="small"
                  onClick={() => setShowErrorDetails(!showErrorDetails)}
                >
                  {showErrorDetails ? '詳細を隠す' : '詳細を表示'}
                </Button>
              </Box>
              
              {showErrorDetails && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>行番号</TableCell>
                        <TableCell>エラー内容</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>
      )}

      {/* サンプルCSVダウンロード */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          CSVフォーマット
        </Typography>
        <Button
          variant="text"
          startIcon={<DownloadIcon />}
          onClick={() => {
            const sampleCSV = 'email,sei,mei,last_name,first_name,last_name_kana,first_name_kana,sei_kana,mei_kana,phone_number,employee_number,department,position,hire_date,education,engineer_status\n';
            const blob = new Blob([sampleCSV], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'engineer_import_sample.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          サンプルCSVをダウンロード
        </Button>
      </Box>
    </Box>
  );
};

export const CsvExportTab: React.FC = () => {
  const [exportOptions, setExportOptions] = useState({
    includeDeleted: false,
    status: 'all' as 'all' | EngineerStatus,
    fields: {
      basic: true,
      contact: true,
      organization: true,
      skills: false,
      projects: false,
    },
  });
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const { exportCSV } = useEngineerMutations();
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccess, showError } = useToast();

  const handleExport = async () => {
    try {
      setIsExporting(true);
      // 型互換のあるエクスポートオプションにマッピング
      const mappedOptions: import('@/types/engineer').ExportOptions = {
        engineerStatus: exportOptions.status === 'all' ? undefined : exportOptions.status,
        includeSkills: exportOptions.fields.skills,
        includeProjects: exportOptions.fields.projects,
        includeStatusHistory: true,
      };
      await exportCSV(mappedOptions, `engineers_${new Date().toISOString().split('T')[0]}.csv`);
      showSuccess('CSVファイルをダウンロードしました');
    } catch (error) {
      console.error('Export failed:', error);
      showError('CSVエクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        CSVファイルのエクスポート
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          登録されているエンジニア情報をCSVファイルとしてダウンロードできます。
        </Typography>
      </Alert>

      {/* エクスポート設定 */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          エクスポート設定
        </Typography>
        
        <List>
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="ステータスフィルタ"
              secondary={
                exportOptions.status === 'all' 
                  ? 'すべてのステータス' 
                  : (exportOptions.status === EngineerStatus.STANDBY
                      ? ENGINEER_STATUS_LABELS[ENGINEER_STATUS.AVAILABLE]
                      : exportOptions.status === EngineerStatus.ACTIVE
                        ? ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ASSIGNED]
                        : exportOptions.status === EngineerStatus.LONG_LEAVE
                          ? ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ON_LEAVE]
                          : ENGINEER_STATUS_LABELS[ENGINEER_STATUS.INACTIVE])
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="削除済みデータ"
              secondary={exportOptions.includeDeleted ? '含める' : '含めない'}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <InfoIcon color="primary" />
            </ListItemIcon>
            <ListItemText
              primary="出力フィールド"
              secondary={
                Object.entries(exportOptions.fields)
                  .filter(([_, value]) => value)
                  .map(([key]) => {
                    switch (key) {
                      case 'basic': return '基本情報';
                      case 'contact': return '連絡先';
                      case 'organization': return '組織情報';
                      case 'skills': return 'スキル';
                      case 'projects': return 'プロジェクト';
                      default: return key;
                    }
                  })
                  .join('、')
              }
            />
          </ListItem>
        </List>
        
        <Button
          variant="outlined"
          onClick={() => setShowOptionsDialog(true)}
          sx={{ mt: 2 }}
        >
          設定を変更
        </Button>
      </Paper>

      {/* エクスポートボタン */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={isExporting}
          startIcon={isExporting ? null : <GetAppIcon />}
        >
          {isExporting ? '処理中...' : 'CSVダウンロード'}
        </Button>
      </Box>

      {/* 処理中表示 */}
      {isExporting && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            エクスポート処理中...
          </Typography>
          <LinearProgress />
        </Box>
      )}

      {/* 設定ダイアログ */}
      <Dialog
        open={showOptionsDialog}
        onClose={() => setShowOptionsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          エクスポート設定
          <IconButton
            onClick={() => setShowOptionsDialog(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">ステータスフィルタ</FormLabel>
            <RadioGroup
              value={exportOptions.status}
              onChange={(e) => setExportOptions(prev => ({ ...prev, status: e.target.value as any }))}
            >
              <FormControlLabel value="all" control={<Radio />} label="すべてのステータス" />
              {/* 旧Enumに合わせた選択肢 */}
              <FormControlLabel value={EngineerStatus.STANDBY} control={<Radio />} label={ENGINEER_STATUS_LABELS[ENGINEER_STATUS.AVAILABLE]} />
              <FormControlLabel value={EngineerStatus.ACTIVE} control={<Radio />} label={ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ASSIGNED]} />
              <FormControlLabel value={EngineerStatus.LONG_LEAVE} control={<Radio />} label={ENGINEER_STATUS_LABELS[ENGINEER_STATUS.ON_LEAVE]} />
              <FormControlLabel value={EngineerStatus.RESIGNED} control={<Radio />} label={ENGINEER_STATUS_LABELS[ENGINEER_STATUS.INACTIVE]} />
            </RadioGroup>
          </FormControl>

          <FormControl component="fieldset" sx={{ mb: 3 }}>
            <FormLabel component="legend">その他のオプション</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.includeDeleted}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      includeDeleted: e.target.checked 
                    }))}
                  />
                }
                label="削除済みデータを含める"
              />
            </FormGroup>
          </FormControl>

          <FormControl component="fieldset">
            <FormLabel component="legend">出力フィールド</FormLabel>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.fields.basic}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      fields: { ...prev.fields, basic: e.target.checked }
                    }))}
                  />
                }
                label="基本情報（名前、メールアドレス等）"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.fields.contact}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      fields: { ...prev.fields, contact: e.target.checked }
                    }))}
                  />
                }
                label="連絡先情報（電話番号）"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.fields.organization}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      fields: { ...prev.fields, organization: e.target.checked }
                    }))}
                  />
                }
                label="組織情報（部署、役職）"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.fields.skills}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      fields: { ...prev.fields, skills: e.target.checked }
                    }))}
                  />
                }
                label="スキル情報"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={exportOptions.fields.projects}
                    onChange={(e) => setExportOptions(prev => ({ 
                      ...prev, 
                      fields: { ...prev.fields, projects: e.target.checked }
                    }))}
                  />
                }
                label="プロジェクト履歴"
              />
            </FormGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowOptionsDialog(false)}>
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
