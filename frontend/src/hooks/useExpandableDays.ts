import { useState } from 'react';

export const useExpandableDays = () => {
  // アコーディオン展開状態の管理
  const [expandedDays, setExpandedDays] = useState<{[key: string]: boolean}>({});
  
  // 特定の日付の展開状態を切り替える
  const toggleDay = (dateStr: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };
  
  // すべての日付を閉じる
  const collapseAll = () => {
    setExpandedDays({});
  };
  
  // すべての日付を開く
  const expandAll = (dateStrs: string[]) => {
    const expanded: {[key: string]: boolean} = {};
    dateStrs.forEach(date => {
      expanded[date] = true;
    });
    setExpandedDays(expanded);
  };
  
  return { 
    expandedDays, 
    toggleDay, 
    collapseAll, 
    expandAll 
  };
}; 