import { WorkHistoryItem } from '@/types/workHistory';

interface ProcessedWorkHistoryData {
  sortedByDate: WorkHistoryItem[];
  groupedByIndustry: Map<string, WorkHistoryItem[]>;
  groupedByYear: Map<string, WorkHistoryItem[]>;
  statistics: {
    totalProjects: number;
    totalMonths: number;
    industries: { name: string; count: number }[];
    technologies: { name: string; count: number }[];
    activeProjects: number;
    completedProjects: number;
  };
}

/**
 * 職務経歴データの処理を行うユーティリティ
 * Web Workerでの実行も想定
 */
export class WorkHistoryDataProcessor {
  /**
   * 職務経歴データを処理して各種集計を行う
   */
  static processWorkHistories(workHistories: WorkHistoryItem[]): ProcessedWorkHistoryData {
    const startTime = performance.now();

    // 日付でソート（降順）
    const sortedByDate = this.sortByDate(workHistories);

    // 業界別グループ化
    const groupedByIndustry = this.groupByIndustry(workHistories);

    // 年別グループ化
    const groupedByYear = this.groupByYear(workHistories);

    // 統計情報の計算
    const statistics = this.calculateStatistics(workHistories);

    const endTime = performance.now();
    console.log(`Data processing completed in ${(endTime - startTime).toFixed(2)}ms`);

    return {
      sortedByDate,
      groupedByIndustry,
      groupedByYear,
      statistics,
    };
  }

  /**
   * 日付でソート（新しい順）
   */
  private static sortByDate(workHistories: WorkHistoryItem[]): WorkHistoryItem[] {
    return [...workHistories].sort((a, b) => {
      if (!a.startDate || !b.startDate) return 0;
      const dateA = new Date(a.startDate).getTime();
      const dateB = new Date(b.startDate).getTime();
      return dateB - dateA;
    });
  }

  /**
   * 業界別にグループ化
   */
  private static groupByIndustry(workHistories: WorkHistoryItem[]): Map<string, WorkHistoryItem[]> {
    const grouped = new Map<string, WorkHistoryItem[]>();
    
    for (const wh of workHistories) {
      const industry = wh.industryName || String(wh.industry);
      if (!grouped.has(industry)) {
        grouped.set(industry, []);
      }
      grouped.get(industry)!.push(wh);
    }

    // 各業界内でも日付順にソート
    Array.from(grouped.entries()).forEach(([, items]) => {
      items.sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });
    });

    return grouped;
  }

  /**
   * 年別にグループ化
   */
  private static groupByYear(workHistories: WorkHistoryItem[]): Map<string, WorkHistoryItem[]> {
    const grouped = new Map<string, WorkHistoryItem[]>();
    
    for (const wh of workHistories) {
      if (wh.startDate) {
        const year = new Date(wh.startDate).getFullYear().toString();
        if (!grouped.has(year)) {
          grouped.set(year, []);
        }
        grouped.get(year)!.push(wh);
      }
    }

    // 年を降順でソート
    const sortedEntries = Array.from(grouped.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    const sortedMap = new Map(sortedEntries);

    // 各年内でも日付順にソート
    Array.from(sortedMap.entries()).forEach(([, items]) => {
      items.sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateB - dateA;
      });
    });

    return sortedMap;
  }

  /**
   * 統計情報の計算
   */
  private static calculateStatistics(workHistories: WorkHistoryItem[]): ProcessedWorkHistoryData['statistics'] {
    const totalProjects = workHistories.length;
    let totalMonths = 0;
    let activeProjects = 0;
    let completedProjects = 0;

    const industryCount = new Map<string, number>();
    const technologyCount = new Map<string, number>();

    for (const wh of workHistories) {
      // 期間の計算
      if (wh.startDate) {
        const startDate = new Date(wh.startDate);
        const endDate = wh.endDate ? new Date(wh.endDate) : new Date();
        const months = this.calculateMonthDifference(startDate, endDate);
        totalMonths += months;
      }

      // アクティブ/完了プロジェクトのカウント
      if (wh.endDate) {
        completedProjects++;
      } else {
        activeProjects++;
      }

      // 業界別カウント
      const industry = wh.industryName || String(wh.industry);
      industryCount.set(industry, (industryCount.get(industry) || 0) + 1);

      // 技術別カウント
      if (wh.technologies) {
        for (const tech of wh.technologies) {
          const techName = tech.technologyName;
          technologyCount.set(techName, (technologyCount.get(techName) || 0) + 1);
        }
      }
    }

    // 業界・技術をカウント順にソート
    const industries = Array.from(industryCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const technologies = Array.from(technologyCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalProjects,
      totalMonths,
      industries,
      technologies,
      activeProjects,
      completedProjects,
    };
  }

  /**
   * 月数の差分を計算
   */
  private static calculateMonthDifference(startDate: Date, endDate: Date): number {
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const MONTHS_PER_YEAR = 12;
    return yearDiff * MONTHS_PER_YEAR + monthDiff + 1;
  }

  /**
   * 検索・フィルタリング処理
   */
  static filterWorkHistories(
    workHistories: WorkHistoryItem[],
    filters: {
      searchQuery?: string;
      industry?: string;
      technologies?: string[];
      startDateFrom?: string;
      startDateTo?: string;
      endDateFrom?: string;
      endDateTo?: string;
      isActive?: boolean;
    }
  ): WorkHistoryItem[] {
    let filtered = [...workHistories];

    // テキスト検索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((wh) => {
        return (
          wh.projectName?.toLowerCase().includes(query) ||
          wh.role?.toLowerCase().includes(query) ||
          wh.companyName?.toLowerCase().includes(query) ||
          wh.projectOverview?.toLowerCase().includes(query)
        );
      });
    }

    // 業界フィルター
    if (filters.industry) {
      filtered = filtered.filter((wh) => 
        wh.industryName === filters.industry || String(wh.industry) === filters.industry
      );
    }

    // 技術フィルター
    if (filters.technologies && filters.technologies.length > 0) {
      filtered = filtered.filter((wh) => {
        if (!wh.technologies) return false;
        const techNames = wh.technologies.map((t) => t.technologyName);
        return filters.technologies!.some((tech) => techNames.includes(tech));
      });
    }

    // 開始日フィルター
    if (filters.startDateFrom) {
      const fromDate = new Date(filters.startDateFrom);
      filtered = filtered.filter((wh) => wh.startDate && new Date(wh.startDate) >= fromDate);
    }
    if (filters.startDateTo) {
      const toDate = new Date(filters.startDateTo);
      filtered = filtered.filter((wh) => wh.startDate && new Date(wh.startDate) <= toDate);
    }

    // 終了日フィルター
    if (filters.endDateFrom && filters.endDateTo) {
      const fromDate = new Date(filters.endDateFrom);
      const toDate = new Date(filters.endDateTo);
      filtered = filtered.filter((wh) => {
        if (!wh.endDate) return false;
        const endDate = new Date(wh.endDate);
        return endDate >= fromDate && endDate <= toDate;
      });
    }

    // アクティブプロジェクトフィルター
    if (filters.isActive !== undefined) {
      filtered = filtered.filter((wh) => {
        return filters.isActive ? !wh.endDate : !!wh.endDate;
      });
    }

    return filtered;
  }
}