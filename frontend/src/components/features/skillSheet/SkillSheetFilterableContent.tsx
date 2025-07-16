import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { UseFormReturn } from 'react-hook-form';
import { SkillSheet, SkillSheetFormData, WorkHistory } from '@/types/skillSheet';
import { WorkHistoryContentCards } from './WorkHistoryContentCards';
// import { TechnicalSkillsSection } from './TechnicalSkillsSection'; // 管理者機能のため一時的にコメントアウト
import { ProfileActionButtons } from '@/components/common/ProfileActionButtons';
import { FilterBar } from '@/components/common/layout';

// 業種オプション（WorkHistoryContentCards.tsxと同じ定義）
const industryOptions = [
  { value: 1, label: 'IT・通信' },
  { value: 2, label: '金融・保険' },
  { value: 3, label: '医療・福祉' },
  { value: 4, label: '製造' },
  { value: 5, label: '小売・流通' },
  { value: 6, label: '公共・官公庁' },
  { value: 7, label: 'その他' },
];

interface SkillSheetFilterableContentProps {
  skillSheet: SkillSheet | null;
  formMethods: UseFormReturn<SkillSheetFormData>;
  onSubmit: () => void;
  onTempSave: () => void;
  isSubmitting: boolean;
  isTempSaved: boolean;
  isDirty?: boolean;
}

/**
 * フィルター機能付きスキルシートコンテンツコンポーネント
 * 職務経歴の検索・フィルター機能を提供
 */
export const SkillSheetFilterableContent: React.FC<SkillSheetFilterableContentProps> = ({
  skillSheet,
  formMethods,
  onSubmit,
  onTempSave,
  isSubmitting,
  isTempSaved,
  isDirty = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<string | number>('all');
  
  // アコーディオン展開状態の管理
  const workHistories = formMethods.watch('workHistory') || [];
  const [expandedItems, setExpandedItems] = useState<boolean[]>(
    workHistories.map((_, index) => index === 0)
  );

  // 検索・フィルター処理
  const filteredWorkHistories = useMemo(() => {
    const workHistories = formMethods.watch('workHistory') || [];
    
    let filtered = [...workHistories];
    
    // 検索フィルタリング
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((history) => {
        // 業種名を取得して検索
        const industryName = industryOptions.find(opt => opt.value === history.industry)?.label || '';
        
        return (
          history.projectName?.toLowerCase().includes(lowerSearchTerm) ||
          industryName.toLowerCase().includes(lowerSearchTerm) ||
          history.technologies?.toLowerCase().includes(lowerSearchTerm) ||
          history.role?.toLowerCase().includes(lowerSearchTerm) ||
          history.projectOverview?.toLowerCase().includes(lowerSearchTerm)
        );
      });
    }
    
    // 期間フィルタリング
    if (filterPeriod !== 'all') {
      const now = new Date();
      const periodYears = parseInt(filterPeriod as string);
      const cutoffDate = new Date(now.getFullYear() - periodYears, now.getMonth(), now.getDate());
      
      filtered = filtered.filter((history) => {
        if (!history.startDate) return false;
        const startDate = new Date(history.startDate);
        return startDate >= cutoffDate;
      });
    }
    
    return filtered;
  }, [formMethods, searchTerm, filterPeriod]);


  // フィルターオプション
  const filterOptions = [
    { value: 'all', label: 'すべての期間' },
    { value: '1', label: '過去1年' },
    { value: '3', label: '過去3年' },
    { value: '5', label: '過去5年' },
    { value: '10', label: '過去10年' },
  ];
  
  // すべて展開
  const handleExpandAll = useCallback(() => {
    setExpandedItems(workHistories.map(() => true));
  }, [workHistories]);
  
  // すべて折りたたむ
  const handleCollapseAll = useCallback(() => {
    setExpandedItems(workHistories.map(() => false));
  }, [workHistories]);


  return (
    <Box>
      {/* フィルターバー */}
      <FilterBar
        searchValue={searchTerm}
        onSearchChange={(e) => setSearchTerm(e.target.value)}
        searchPlaceholder="プロジェクト名、業界、技術で検索..."
        filterValue={filterPeriod}
        onFilterChange={(e) => setFilterPeriod(e.target.value)}
        filterLabel="期間"
        filterOptions={filterOptions}
        data-testid="skill-sheet-filter-bar"
      />

      {/* フィルタリング結果の表示と全体コントロール */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 2,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1
      }}>
        <Box>
          {searchTerm || filterPeriod !== 'all' ? (
            <Typography variant="body2" color="text.secondary">
              {filteredWorkHistories.length}件の職務経歴が見つかりました
              {searchTerm && ` (検索: "${searchTerm}")`}
              {filterPeriod !== 'all' && ` (期間: ${filterOptions.find(opt => opt.value === filterPeriod)?.label})`}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {workHistories.length}件の職務経歴
            </Typography>
          )}
        </Box>
        
        {workHistories.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              size="small" 
              onClick={handleExpandAll}
              variant="outlined"
            >
              すべて展開
            </Button>
            <Button 
              size="small" 
              onClick={handleCollapseAll}
              variant="outlined"
            >
              すべて折りたたむ
            </Button>
          </Box>
        )}
      </Box>

      {/* 職務経歴セクション（フィルタリング済み） */}
      <WorkHistoryContentCards 
        formMethods={formMethods}
        filteredIndices={searchTerm || filterPeriod !== 'all' 
          ? (formMethods.watch('workHistory') || []).map((history, index) => 
              filteredWorkHistories.includes(history) ? index : -1
            ).filter(idx => idx !== -1)
          : undefined
        }
        expandedItems={expandedItems}
        onExpandedChange={setExpandedItems}
      />

      {/* 技術スキル概要セクション */}
      {/* 
        NOTE: 技術スキル概要機能は管理者向け機能として設計されているため、一時的に無効化しています。
        将来の管理者画面実装時に以下のコメントを解除してください。
        詳細は /docs/04_development/technical-skills-summary-specification.md を参照してください。
      */}
      {/* {skillSheet?.technicalSkills && skillSheet.technicalSkills.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <TechnicalSkillsSection 
            technicalSkills={skillSheet.technicalSkills}
          />
        </Box>
      )} */}

      {/* フッターアクションボタン */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <ProfileActionButtons
          onTempSave={onTempSave}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          isTempSaved={isTempSaved}
          variant="footer"
          isDirty={isDirty}
        />
      </Box>
    </Box>
  );
};