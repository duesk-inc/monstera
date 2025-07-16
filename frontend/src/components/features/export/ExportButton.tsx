import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Description as CsvIcon,
  TableChart as ExcelIcon,
  PictureAsPdf as PdfIcon,
  ArrowDropDown as ArrowDropDownIcon,
} from '@mui/icons-material';
import type { ExportJobFormat } from '@/types/export';

interface ExportButtonProps {
  onExport: (format: ExportJobFormat) => void;
  loading?: boolean;
  disabled?: boolean;
  formats?: ExportJobFormat[];
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  loading = false,
  disabled = false,
  formats = ['csv', 'excel'],
  buttonText = 'エクスポート',
  size = 'medium',
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleExport = (format: ExportJobFormat) => {
    onExport(format);
    handleClose();
  };

  const getFormatIcon = (format: ExportJobFormat) => {
    switch (format) {
      case 'csv':
        return <CsvIcon />;
      case 'excel':
        return <ExcelIcon />;
      case 'pdf':
        return <PdfIcon />;
      default:
        return <DownloadIcon />;
    }
  };

  const getFormatLabel = (format: ExportJobFormat) => {
    switch (format) {
      case 'csv':
        return 'CSV形式';
      case 'excel':
        return 'Excel形式';
      case 'pdf':
        return 'PDF形式';
      default:
        return format.toUpperCase();
    }
  };

  // フォーマットが1つだけの場合は直接エクスポート
  if (formats.length === 1) {
    return (
      <Button
        variant="outlined"
        size={size}
        startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
        onClick={() => onExport(formats[0])}
        disabled={disabled || loading}
      >
        {buttonText}
      </Button>
    );
  }

  // 複数フォーマットの場合はメニュー表示
  return (
    <>
      <Button
        variant="outlined"
        size={size}
        startIcon={loading ? <CircularProgress size={16} /> : <DownloadIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleClick}
        disabled={disabled || loading}
      >
        {buttonText}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {formats.map((format) => (
          <MenuItem key={format} onClick={() => handleExport(format)}>
            <ListItemIcon>{getFormatIcon(format)}</ListItemIcon>
            <ListItemText>{getFormatLabel(format)}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};