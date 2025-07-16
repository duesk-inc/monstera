'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { PageContainer } from '@/components/common/layout';
import { Breadcrumbs } from '@/components/common';
import { CsvImportTab, CsvExportTab } from '@/components/admin/engineers/CsvImportExport';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`csv-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function EngineerCsvImport() {
  const router = useRouter();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <PageContainer 
      title="エンジニアCSV処理"
      breadcrumbs={
        <Breadcrumbs 
          items={[
            { label: '管理者ダッシュボード', href: '/admin/dashboard' },
            { label: 'エンジニア管理', href: '/admin/engineers' },
            { label: 'CSV処理' },
          ]}
        />
      }
    >
      {/* ヘッダー */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/admin/engineers')}
        >
          一覧に戻る
        </Button>
      </Box>

      <Card>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            icon={<FileUploadIcon />} 
            label="インポート" 
            iconPosition="start"
          />
          <Tab 
            icon={<FileDownloadIcon />} 
            label="エクスポート" 
            iconPosition="start"
          />
        </Tabs>

        <CardContent>
          {/* インポートタブ */}
          <TabPanel value={tabValue} index={0}>
            <CsvImportTab />
          </TabPanel>

          {/* エクスポートタブ */}
          <TabPanel value={tabValue} index={1}>
            <CsvExportTab />
          </TabPanel>
        </CardContent>
      </Card>

      {/* 共通の注意事項 */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          ※ CSVファイルの文字コードはUTF-8を推奨します。
        </Typography>
        <Typography variant="body2">
          ※ 大量のデータを処理する場合は、時間がかかることがあります。
        </Typography>
      </Alert>
    </PageContainer>
  );
}