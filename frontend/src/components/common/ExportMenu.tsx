import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as ExcelIcon,
  InsertDriveFile as CsvIcon,
  PictureAsPdf as PdfIcon,
  CloudUpload as CloudIcon,
} from '@mui/icons-material';

export type ExportFormat = 'excel' | 'csv' | 'pdf' | 'google-drive';

interface ExportMenuProps {
  onExport: (format: ExportFormat) => void;
  loading?: boolean;
  disabled?: boolean;
  formats?: ExportFormat[];
  buttonText?: string;
  buttonVariant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  'data-testid'?: string;
}

const formatIcons: Record<ExportFormat, React.ReactElement> = {
  excel: <ExcelIcon />,
  csv: <CsvIcon />,
  pdf: <PdfIcon />,
  'google-drive': <CloudIcon />,
};

const formatLabels: Record<ExportFormat, string> = {
  excel: 'Excel形式でダウンロード',
  csv: 'CSV形式でダウンロード',
  pdf: 'PDF形式でダウンロード',
  'google-drive': 'Google Driveに保存',
};

export const ExportMenu: React.FC<ExportMenuProps> = ({
  onExport,
  loading = false,
  disabled = false,
  formats = ['excel', 'csv'],
  buttonText = 'エクスポート',
  buttonVariant = 'outlined',
  size = 'medium',
  'data-testid': testId,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    handleClose();
  };

  return (
    <>
      <Button
        variant={buttonVariant}
        size={size}
        onClick={handleClick}
        startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
        disabled={disabled || loading}
        data-testid={testId}
      >
        {buttonText}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        data-testid="export-menu"
      >
        {formats.map((format, index) => (
          <React.Fragment key={format}>
            {format === 'google-drive' && index > 0 && <Divider />}
            <MenuItem onClick={() => handleExport(format)} data-testid={`export-${format}-option`}>
              <ListItemIcon>{formatIcons[format]}</ListItemIcon>
              <ListItemText>{formatLabels[format]}</ListItemText>
            </MenuItem>
          </React.Fragment>
        ))}
      </Menu>
    </>
  );
};