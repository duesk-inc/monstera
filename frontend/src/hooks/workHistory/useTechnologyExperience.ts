import { useState, useCallback, useMemo } from 'react';
import type { TechnologyExperience } from '../../components/features/workHistory/TechnologyExperienceInput';

interface UseTechnologyExperienceOptions {
  initialExperiences?: TechnologyExperience[];
  onChange?: (experiences: TechnologyExperience[]) => void;
}

interface UseTechnologyExperienceReturn {
  experiences: TechnologyExperience[];
  setExperiences: (experiences: TechnologyExperience[]) => void;
  addExperience: (experience: TechnologyExperience) => void;
  updateExperience: (techName: string, years: number, months: number) => void;
  removeExperience: (techName: string) => void;
  getExperience: (techName: string) => TechnologyExperience | undefined;
  getTotalExperienceMonths: (techName: string) => number;
  getAverageExperience: () => { years: number; months: number };
  getExperiencesByCategory: (category: 'programmingLanguages' | 'serversDatabases' | 'tools') => TechnologyExperience[];
  hasExperience: (techName: string) => boolean;
  clearExperiences: () => void;
  exportExperiences: () => string;
  importExperiences: (data: string) => boolean;
}

export const useTechnologyExperience = (
  options: UseTechnologyExperienceOptions = {}
): UseTechnologyExperienceReturn => {
  const { initialExperiences = [], onChange } = options;
  const [experiences, setExperiencesState] = useState<TechnologyExperience[]>(initialExperiences);

  // 経験を設定
  const setExperiences = useCallback((newExperiences: TechnologyExperience[]) => {
    setExperiencesState(newExperiences);
    onChange?.(newExperiences);
  }, [onChange]);

  // 経験を追加
  const addExperience = useCallback((experience: TechnologyExperience) => {
    setExperiences((prev) => {
      // 既存の同名技術を削除して新規追加
      const filtered = prev.filter(exp => exp.name !== experience.name);
      return [...filtered, experience];
    });
  }, [setExperiences]);

  // 経験を更新
  const updateExperience = useCallback((techName: string, years: number, months: number) => {
    setExperiences((prev) => {
      const existing = prev.find(exp => exp.name === techName);
      if (!existing) return prev;

      return prev.map(exp =>
        exp.name === techName
          ? { ...exp, years, months }
          : exp
      );
    });
  }, [setExperiences]);

  // 経験を削除
  const removeExperience = useCallback((techName: string) => {
    setExperiences((prev) => prev.filter(exp => exp.name !== techName));
  }, [setExperiences]);

  // 特定技術の経験を取得
  const getExperience = useCallback((techName: string): TechnologyExperience | undefined => {
    return experiences.find(exp => exp.name === techName);
  }, [experiences]);

  // 特定技術の総経験月数を取得
  const getTotalExperienceMonths = useCallback((techName: string): number => {
    const exp = getExperience(techName);
    if (!exp) return 0;
    const MONTHS_IN_YEAR = 12;
    return exp.years * MONTHS_IN_YEAR + exp.months;
  }, [getExperience]);

  // 平均経験期間を計算
  const getAverageExperience = useCallback((): { years: number; months: number } => {
    if (experiences.length === 0) {
      return { years: 0, months: 0 };
    }

    const MONTHS_IN_YEAR = 12;
    const totalMonths = experiences.reduce((sum, exp) => {
      return sum + (exp.years * MONTHS_IN_YEAR + exp.months);
    }, 0);

    const avgMonths = Math.round(totalMonths / experiences.length);
    return {
      years: Math.floor(avgMonths / MONTHS_IN_YEAR),
      months: avgMonths % MONTHS_IN_YEAR,
    };
  }, [experiences]);

  // カテゴリごとの経験を取得
  const getExperiencesByCategory = useCallback(
    (category: 'programmingLanguages' | 'serversDatabases' | 'tools'): TechnologyExperience[] => {
      return experiences.filter(exp => exp.category === category);
    },
    [experiences]
  );

  // 経験が設定されているか確認
  const hasExperience = useCallback((techName: string): boolean => {
    return experiences.some(exp => exp.name === techName);
  }, [experiences]);

  // 全経験をクリア
  const clearExperiences = useCallback(() => {
    setExperiences([]);
  }, [setExperiences]);

  // エクスポート（JSON文字列化）
  const exportExperiences = useCallback((): string => {
    return JSON.stringify(experiences);
  }, [experiences]);

  // インポート（JSON文字列から復元）
  const importExperiences = useCallback((data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid data format');
      }

      // バリデーション
      const isValid = parsed.every(item =>
        typeof item.name === 'string' &&
        typeof item.years === 'number' &&
        typeof item.months === 'number' &&
        ['programmingLanguages', 'serversDatabases', 'tools'].includes(item.category)
      );

      if (!isValid) {
        throw new Error('Invalid experience data');
      }

      setExperiences(parsed);
      return true;
    } catch (error) {
      console.error('Failed to import experiences:', error);
      return false;
    }
  }, [setExperiences]);

  // 統計情報
  const stats = useMemo(() => {
    const totalCount = experiences.length;
    const byCategory = {
      programmingLanguages: getExperiencesByCategory('programmingLanguages').length,
      serversDatabases: getExperiencesByCategory('serversDatabases').length,
      tools: getExperiencesByCategory('tools').length,
    };

    const MONTHS_IN_YEAR = 12;
    const totalMonths = experiences.reduce((sum, exp) => {
      return sum + (exp.years * MONTHS_IN_YEAR + exp.months);
    }, 0);

    const maxExperience = experiences.reduce((max, exp) => {
      const months = exp.years * MONTHS_IN_YEAR + exp.months;
      return months > max.months ? { tech: exp.name, months } : max;
    }, { tech: '', months: 0 });

    return {
      totalCount,
      byCategory,
      totalMonths,
      averageMonths: totalCount > 0 ? Math.round(totalMonths / totalCount) : 0,
      maxExperience,
    };
  }, [experiences, getExperiencesByCategory]);

  return {
    experiences,
    setExperiences,
    addExperience,
    updateExperience,
    removeExperience,
    getExperience,
    getTotalExperienceMonths,
    getAverageExperience,
    getExperiencesByCategory,
    hasExperience,
    clearExperiences,
    exportExperiences,
    importExperiences,
  };
};

// 経験レベルの判定ヘルパー
const EXPERIENCE_THRESHOLDS = {
  BEGINNER: 6,
  INTERMEDIATE: 24,
  ADVANCED: 60,
};

export const getExperienceLevel = (
  months: number
): {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  label: string;
  color: 'primary' | 'secondary' | 'success' | 'error';
} => {
  if (months < EXPERIENCE_THRESHOLDS.BEGINNER) {
    return { level: 'beginner', label: '初級', color: 'primary' };
  } else if (months < EXPERIENCE_THRESHOLDS.INTERMEDIATE) {
    return { level: 'intermediate', label: '中級', color: 'secondary' };
  } else if (months < EXPERIENCE_THRESHOLDS.ADVANCED) {
    return { level: 'advanced', label: '上級', color: 'success' };
  } else {
    return { level: 'expert', label: 'エキスパート', color: 'error' };
  }
};

// 経験期間のフォーマットヘルパー
export const formatExperienceDuration = (years: number, months: number): string => {
  if (years === 0 && months === 0) return '経験なし';
  
  const parts = [];
  if (years > 0) parts.push(`${years}年`);
  if (months > 0) parts.push(`${months}ヶ月`);
  
  return parts.join('');
};

// 技術スキルマトリクスの生成
export const generateSkillMatrix = (
  experiences: TechnologyExperience[]
): Array<{
  category: string;
  technologies: Array<{
    name: string;
    experience: string;
    level: string;
    months: number;
  }>;
}> => {
  const categories = ['programmingLanguages', 'serversDatabases', 'tools'];
  const categoryLabels = {
    programmingLanguages: 'プログラミング言語',
    serversDatabases: 'サーバー・データベース',
    tools: 'ツール・その他',
  };

  return categories.map(category => {
    const categoryExperiences = experiences
      .filter(exp => exp.category === category)
      .map(exp => {
        const MONTHS_IN_YEAR = 12;
        const months = exp.years * MONTHS_IN_YEAR + exp.months;
        const { label } = getExperienceLevel(months);
        return {
          name: exp.name,
          experience: formatExperienceDuration(exp.years, exp.months),
          level: label,
          months,
        };
      })
      .sort((a, b) => b.months - a.months); // 経験期間でソート

    return {
      category: categoryLabels[category as keyof typeof categoryLabels],
      technologies: categoryExperiences,
    };
  });
};