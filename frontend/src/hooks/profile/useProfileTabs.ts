import { useState, useCallback } from 'react';

interface UseProfileTabsReturn {
  tabIndex: number;
  setTabIndex: (index: number) => void;
  handleTabChange: (event: React.SyntheticEvent, newValue: number) => void;
}

/**
 * プロフィールページのタブ状態を管理するフック
 */
export const useProfileTabs = (initialTab = 0): UseProfileTabsReturn => {
  const [tabIndex, setTabIndex] = useState(initialTab);
  
  const handleTabChange = useCallback((_: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  }, []);
  
  return {
    tabIndex,
    setTabIndex,
    handleTabChange,
  };
}; 