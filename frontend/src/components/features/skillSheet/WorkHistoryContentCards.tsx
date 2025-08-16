import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, TextField, Stack, IconButton, FormControl, InputLabel, Chip, useMediaQuery, useTheme, Tooltip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Work as WorkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CalendarMonth as CalendarIcon,
  Business as BusinessIcon,
  Group as GroupIcon,
  Add as AddIcon,
  DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { SkillSheetFormData } from '@/types/skillSheet';
import { ContentCard, SectionHeader, EmptyState } from '@/components/common/layout';
import { DetailInfoGrid, DetailInfoItem } from '@/components/common/layout';
import { ConfirmDialog, FormDatePicker, FormSelect, FormCheckboxGroup, CommonAccordion } from '@/components/common';
import { TechnologiesSection } from '@/components/features/profile/TechnologySection';
import { WorkHistoryEditDialog } from './WorkHistoryEditDialog';
import ActionButton from '@/components/common/ActionButton';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useWorkHistoryMutation } from '@/hooks/useWorkHistoryMutation';
import { useToast } from '@/components/common';

// 担当工程オプション
const processOptions = [
  { value: 1, label: '要件定義' },
  { value: 2, label: '基本設計' },
  { value: 3, label: '詳細設計' },
  { value: 4, label: '製造・実装' },
  { value: 5, label: 'テスト' },
  { value: 6, label: '保守・運用' },
];

// 業種オプション
const industryOptions = [
  { value: 1, label: 'IT・通信' },
  { value: 2, label: '金融・保険' },
  { value: 3, label: '医療・福祉' },
  { value: 4, label: '製造' },
  { value: 5, label: '小売・流通' },
  { value: 6, label: '公共・官公庁' },
  { value: 7, label: 'その他' },
];

interface WorkHistoryContentCardsProps {
  formMethods: UseFormReturn<SkillSheetFormData>;
  filteredIndices?: number[];
  expandedItems?: boolean[];
  onExpandedChange?: (expanded: boolean[]) => void;
  userId?: string;
  profileId?: string;
}

/**
 * 職務経歴ContentCard表示コンポーネント
 * ContentCardとSectionHeaderを使用した最適化されたUI
 */
export const WorkHistoryContentCards: React.FC<WorkHistoryContentCardsProps> = React.memo(({
  formMethods,
  filteredIndices,
  expandedItems,
  onExpandedChange,
  userId,
  profileId,
}) => {
  const { 
    control, 
    register, 
    formState: { errors },
    getValues,
    setValue,
  } = formMethods;
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { showSuccess, showError } = useToast();
  
  // 個別削除用のミューテーション
  const { delete: deleteWorkHistory, isDeleting } = useWorkHistoryMutation();

  // 編集ダイアログの状態
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean;
    index: number;
    isNew: boolean;
  }>({
    isOpen: false,
    index: -1,
    isNew: false,
  });

  // 削除確認ダイアログの状態
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    targetIndex: number;
  }>({
    isOpen: false,
    targetIndex: -1
  });
  
  // アコーディオン展開状態の管理（内部状態）
  const [internalExpandedItems, setInternalExpandedItems] = useState<boolean[]>([]);
  
  // 実際の展開状態（外部制御を優先）
  const expandedState = expandedItems || internalExpandedItems;

  // フィールド配列を監視
  const workHistoryFields = useWatch({
    control,
    name: 'workHistory'
  }) || [];

  // フィルター適用
  const displayWorkHistories = useMemo(() => {
    if (!filteredIndices) return workHistoryFields;
    return filteredIndices.map(index => workHistoryFields[index]);
  }, [workHistoryFields, filteredIndices]);
  
  // 展開状態の初期化
  React.useEffect(() => {
    if (expandedState.length !== workHistoryFields.length) {
      const newExpanded = workHistoryFields.map((_, index) => index === 0);
      if (onExpandedChange) {
        onExpandedChange(newExpanded);
      } else {
        setInternalExpandedItems(newExpanded);
      }
    }
  }, [workHistoryFields.length]); // expandedState.lengthを依存配列から除外して無限ループを回避

  // 職務経歴の追加ハンドラー
  const handleAddWorkHistory = useCallback(() => {
    const currentValues = getValues('workHistory') || [];
    const newIndex = currentValues.length;
    
    // 新規作成用の空データを追加
    const emptyWorkHistory = {
      projectName: '',
      startDate: null,
      endDate: null,
      industry: 7, // デフォルトは「その他」
      projectOverview: '',
      responsibilities: '',
      achievements: '',
      notes: '',
      processes: [],
      technologies: '',
      programmingLanguages: [''],
      serversDatabases: [''],
      tools: [''],
      teamSize: 0,
      role: 'SE', // デフォルトは「SE」
    };
    
    // 先にデータを追加してから編集ダイアログを開く
    setValue('workHistory', [...currentValues, emptyWorkHistory]);
    
    // 編集ダイアログを開く
    setEditDialog({
      isOpen: true,
      index: newIndex,
      isNew: true,
    });
  }, [getValues, setValue]);

  // 職務経歴の削除ハンドラー
  const handleDeleteWorkHistory = useCallback(async (index: number) => {
    const currentValues = getValues('workHistory') || [];
    const targetHistory = currentValues[index];
    
    // IDがある場合は個別削除
    if (targetHistory?.id) {
      try {
        await deleteWorkHistory(
          targetHistory.id,
          userId || '',
          {
            onSuccess: () => {
              // 成功したらフォームからも削除
              const newValues = currentValues.filter((_, i) => i !== index);
              setValue('workHistory', newValues);
              showSuccess('職務経歴を削除しました');
            },
            onError: (error) => {
              showError(`削除に失敗しました: ${error.message}`);
            },
            showToast: false,
            confirm: false // 確認ダイアログは既に表示済み
          }
        );
      } catch (error) {
        console.error('Failed to delete work history:', error);
      }
    } else {
      // IDがない場合はフォームから削除
      const newValues = currentValues.filter((_, i) => i !== index);
      setValue('workHistory', newValues);
    }
    
    setDeleteConfirmDialog({ isOpen: false, targetIndex: -1 });
  }, [getValues, setValue, deleteWorkHistory, userId, showSuccess, showError]);

  // 編集ダイアログを開く
  const handleOpenEditDialog = useCallback((index: number) => {
    setEditDialog({
      isOpen: true,
      index: index,
      isNew: false,
    });
  }, []);

  // 編集ダイアログを閉じる
  const handleCloseEditDialog = useCallback(() => {
    // 新規追加でキャンセルした場合は、追加した空データを削除
    if (editDialog.isNew) {
      const currentValues = getValues('workHistory') || [];
      const newData = currentValues[editDialog.index];
      
      // プロジェクト名が空の場合は、追加した空データを削除
      if (!newData?.projectName) {
        const filteredValues = currentValues.filter((_, i) => i !== editDialog.index);
        setValue('workHistory', filteredValues);
      }
    }
    
    setEditDialog({
      isOpen: false,
      index: -1,
      isNew: false,
    });
  }, [editDialog, getValues, setValue]);

  // 編集内容を保存
  const handleSaveEdit = useCallback(() => {
    // 新規追加の場合も既存編集の場合も、データは既にフォームに反映されている
    // ダイアログを閉じるだけで良い
    handleCloseEditDialog();
  }, [handleCloseEditDialog]);

  // 期間の長さを計算（年月単位）
  const calculatePeriodLength = useCallback((startDate: Date | null, endDate: Date | null) => {
    if (!startDate) return '';
    
    const end = endDate || new Date();
    const start = new Date(startDate);
    
    // 月数の差を計算
    let months = (end.getFullYear() - start.getFullYear()) * 12;
    months += end.getMonth() - start.getMonth();
    
    // 日付を考慮した調整
    if (end.getDate() < start.getDate()) {
      months--;
    }
    
    // 0ヶ月以下の場合
    if (months <= 0) {
      return '1ヶ月未満';
    }
    
    // 年と月に変換
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years > 0) {
      if (remainingMonths > 0) {
        return `${years}年${remainingMonths}ヶ月`;
      } else {
        return `${years}年`;
      }
    } else {
      return `${remainingMonths}ヶ月`;
    }
  }, []);
  
  // 期間の表示フォーマット（期間の長さを含む）
  const formatPeriod = useCallback((startDate: Date | null, endDate: Date | null, includeDuration: boolean = false) => {
    if (!startDate) return '未設定';
    const start = format(startDate, 'yyyy年MM月', { locale: ja });
    const end = endDate ? format(endDate, 'yyyy年MM月', { locale: ja }) : '現在';
    
    const basePeriod = `${start} - ${end}`;
    
    if (includeDuration) {
      const duration = calculatePeriodLength(startDate, endDate);
      return `${basePeriod} (${duration})`;
    }
    
    return basePeriod;
  }, [calculatePeriodLength]);

  // 業種の表示名を取得
  const getIndustryName = (industryId: number) => {
    const industry = industryOptions.find(opt => opt.value === industryId);
    return industry?.label || '未設定';
  };

  // 担当工程の表示名を取得
  const getProcessNames = (processIds: number[]) => {
    return processIds
      .map(id => processOptions.find(opt => opt.value === id)?.label)
      .filter(Boolean);
  };
  
  // 主要技術を取得（最大3つ）
  const getMainTechnologies = useCallback((workHistory: any) => {
    const allTechnologies: string[] = [];
    
    if (workHistory.programmingLanguages && workHistory.programmingLanguages.length > 0) {
      allTechnologies.push(...workHistory.programmingLanguages.filter((lang: string) => lang));
    }
    if (workHistory.serversDatabases && workHistory.serversDatabases.length > 0) {
      allTechnologies.push(...workHistory.serversDatabases.filter((item: string) => item));
    }
    if (workHistory.tools && workHistory.tools.length > 0) {
      allTechnologies.push(...workHistory.tools.filter((tool: string) => tool));
    }
    
    return allTechnologies.slice(0, 3);
  }, []);
  
  // アコーディオンの展開状態を切り替え
  const handleToggleExpanded = useCallback((index: number, isExpanded: boolean) => {
    const newExpanded = [...expandedState];
    newExpanded[index] = isExpanded;
    
    if (onExpandedChange) {
      onExpandedChange(newExpanded);
    } else {
      setInternalExpandedItems(newExpanded);
    }
  }, [expandedState, onExpandedChange]);

  // 職務経歴追加ボタンコンポーネント
  const AddWorkHistoryButton = (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center',
      mt: displayWorkHistories.length === 0 ? 3 : 4,
      mb: 2,
    }}>
      <ActionButton
        buttonType="primary"
        size="large"
        startIcon={<AddIcon />}
        onClick={handleAddWorkHistory}
        sx={{
          px: 4,
          py: 1.5,
          borderRadius: 8,
          fontSize: '1rem',
          fontWeight: 600,
          boxShadow: 3,
          '&:hover': {
            boxShadow: 4,
          }
        }}
      >
        職務経歴を追加
      </ActionButton>
    </Box>
  );

  // 空状態の表示
  if (displayWorkHistories.length === 0) {
    return (
      <Box>
        <EmptyState
          type="folder"
          message="職務経歴がありません"
          description="新しい職務経歴を追加してください"
          sx={{ mt: 3 }}
        />
        {AddWorkHistoryButton}
      </Box>
    );
  }

  return (
    <Box>
      {displayWorkHistories.map((workHistory, displayIndex) => {
        // フィルター適用時の実際のインデックスを計算
        const actualIndex = filteredIndices ? filteredIndices[displayIndex] : displayIndex;

        // 詳細情報アイテムの構築
        const detailItems: DetailInfoItem[] = [
          {
            label: '期間',
            value: formatPeriod(workHistory.startDate, workHistory.endDate, true),
            icon: <CalendarIcon sx={{ fontSize: 18 }} />,
            gridSize: { xs: 12, md: 6 }
          },
          {
            label: '業種',
            value: getIndustryName(workHistory.industry),
            icon: <BusinessIcon sx={{ fontSize: 18 }} />,
            gridSize: { xs: 12, md: 6 }
          },
          {
            label: 'チーム規模',
            value: workHistory.teamSize ? `${workHistory.teamSize}名` : '未設定',
            icon: <GroupIcon sx={{ fontSize: 18 }} />,
            gridSize: { xs: 12, md: 6 }
          },
          {
            label: '役割',
            value: workHistory.role || '未設定',
            gridSize: { xs: 12, md: 6 }
          },
        ];

        // アコーディオンヘッダーのカスタムコンテンツ
        const customHeader = (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            width: '100%',
            gap: 2,
            pr: 2,
          }}>
            {/* アイコンとプロジェクト情報 */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: 1 }}>
              <WorkIcon color="primary" sx={{ flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                  {workHistory.projectName || `プロジェクト #${actualIndex + 1}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPeriod(workHistory.startDate, workHistory.endDate, true)}
                </Typography>
              </Box>
            </Box>
            
            {/* 業種・主要技術（PC表示） */}
            <Box sx={{ 
              display: { xs: 'none', sm: 'flex' }, 
              gap: 1, 
              alignItems: 'center',
              flexShrink: 0 
            }}>
              <Chip 
                label={getIndustryName(workHistory.industry)} 
                size="small" 
                variant="outlined"
              />
              {getMainTechnologies(workHistory).map((tech, idx) => (
                <Chip 
                  key={idx} 
                  label={tech} 
                  size="small" 
                  variant="outlined"
                  sx={{
                    borderColor: 'primary.main',
                    color: 'primary.main',
                  }}
                />
              ))}
            </Box>
            
            {/* アクションボタン */}
            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
              <Tooltip title="編集">
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditDialog(actualIndex);
                  }}
                  size={isMobile ? "medium" : "small"}
                  color="primary"
                  sx={{ 
                    minWidth: isMobile ? 44 : 32,
                    minHeight: isMobile ? 44 : 32 
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="削除">
                <IconButton 
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmDialog({ 
                      isOpen: true, 
                      targetIndex: actualIndex 
                    });
                  }}
                  size={isMobile ? "medium" : "small"}
                  color="error"
                  sx={{ 
                    minWidth: isMobile ? 44 : 32,
                    minHeight: isMobile ? 44 : 32 
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        );
        
        return (
          <CommonAccordion
            key={actualIndex}
            title=""
            customHeader={customHeader}
            variant="outlined"
            defaultExpanded={actualIndex === 0}
            expanded={expandedState[actualIndex]}
            onToggle={(isExpanded) => handleToggleExpanded(actualIndex, isExpanded)}
            sx={{ mb: 3 }}
            data-testid={`work-history-accordion-${actualIndex}`}
          >

            {/* 基本情報 */}
            <Box sx={{ pt: 2 }}>
              <DetailInfoGrid items={detailItems} spacing={2} sx={{ mb: 3 }} />
            </Box>

            {/* 担当工程 */}
            {workHistory.processes && workHistory.processes.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  担当工程
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {getProcessNames(workHistory.processes).map((process, idx) => (
                    <Chip
                      key={idx}
                      label={process}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        '&:hover': {
                          backgroundColor: 'rgba(46, 125, 50, 0.08)',
                          borderColor: 'primary.dark',
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* プロジェクト概要 */}
            {workHistory.projectOverview && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  プロジェクト概要
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {workHistory.projectOverview}
                </Typography>
              </Box>
            )}

            {/* 担当業務 */}
            {workHistory.responsibilities && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  担当業務
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {workHistory.responsibilities}
                </Typography>
              </Box>
            )}

            {/* 成果・実績 */}
            {workHistory.achievements && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  成果・実績
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {workHistory.achievements}
                </Typography>
              </Box>
            )}

            {/* 備考 */}
            {workHistory.notes && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  備考
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {workHistory.notes}
                </Typography>
              </Box>
            )}

            {/* 技術スタック */}
            {(() => {
              const hasProgLangs = workHistory.programmingLanguages && workHistory.programmingLanguages.filter((lang: string) => lang && lang.trim() !== '').length > 0;
              const hasServersDBs = workHistory.serversDatabases && workHistory.serversDatabases.filter((item: string) => item && item.trim() !== '').length > 0;
              const hasTools = workHistory.tools && workHistory.tools.filter((tool: string) => tool && tool.trim() !== '').length > 0;
              
              if (!hasProgLangs && !hasServersDBs && !hasTools) {
                return null;
              }
              
              return (
                <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    使用技術
                  </Typography>
                  <Grid container spacing={2}>
                    {workHistory.programmingLanguages && workHistory.programmingLanguages.filter((lang: string) => lang && lang.trim() !== '').length > 0 && (
                      <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      プログラミング言語
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {workHistory.programmingLanguages.filter((lang: string) => lang && lang.trim() !== '').map((lang, idx) => (
                        <Chip 
                          key={idx} 
                          label={lang} 
                          size="small" 
                          variant="outlined"
                          sx={{
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.08)',
                              borderColor: 'primary.dark',
                            }
                          }}
                        />
                      ))}
                    </Box>
                      </Grid>
                    )}
                    {workHistory.serversDatabases && workHistory.serversDatabases.filter((item: string) => item && item.trim() !== '').length > 0 && (
                      <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      サーバー・DB
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {workHistory.serversDatabases.filter((item: string) => item && item.trim() !== '').map((item, idx) => (
                        <Chip 
                          key={idx} 
                          label={item} 
                          size="small" 
                          variant="outlined"
                          sx={{
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.08)',
                              borderColor: 'primary.dark',
                            }
                          }}
                        />
                      ))}
                    </Box>
                      </Grid>
                    )}
                    {workHistory.tools && workHistory.tools.filter((tool: string) => tool && tool.trim() !== '').length > 0 && (
                      <Grid size={{ xs: 12, md: 4 }}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      ツール
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {workHistory.tools.filter((tool: string) => tool && tool.trim() !== '').map((tool, idx) => (
                        <Chip 
                          key={idx} 
                          label={tool} 
                          size="small" 
                          variant="outlined"
                          sx={{
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            '&:hover': {
                              backgroundColor: 'rgba(46, 125, 50, 0.08)',
                              borderColor: 'primary.dark',
                            }
                          }}
                        />
                      ))}
                    </Box>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              );
            })()}
          </CommonAccordion>
        );
      })}

      {/* 新規追加ボタン */}
      {AddWorkHistoryButton}

      {/* 編集ダイアログ */}
      {editDialog.index >= 0 && (
        <WorkHistoryEditDialog
          open={editDialog.isOpen}
          onClose={handleCloseEditDialog}
          onSave={handleSaveEdit}
          formMethods={formMethods}
          workHistoryIndex={editDialog.index}
          isNew={editDialog.isNew}
          workHistoryId={workHistoryFields?.[editDialog.index]?.id}
          userId={userId}
          profileId={profileId}
        />
      )}

      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        open={deleteConfirmDialog.isOpen}
        title="職務経歴の削除"
        message="この職務経歴を削除してもよろしいですか？"
        confirmText="削除"
        cancelText="キャンセル"
        confirmColor="error"
        onConfirm={() => handleDeleteWorkHistory(deleteConfirmDialog.targetIndex)}
        onCancel={() => setDeleteConfirmDialog({ isOpen: false, targetIndex: -1 })}
      />
    </Box>
  );
});