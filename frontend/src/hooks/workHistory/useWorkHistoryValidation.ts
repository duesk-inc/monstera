import { useMemo, useCallback } from 'react';
import { isValid, isBefore, differenceInMonths } from 'date-fns';
import type { WorkHistoryFormData } from '../../types/workHistory';

// バリデーションエラーの型定義
export interface ValidationError {
  field: string;
  message: string;
  severity?: 'error' | 'warning' | 'info';
  code?: string;
}

export interface WorkHistoryValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, string>;
  warnings: ValidationError[];
  hasWarnings: boolean;
  overallScore?: number; // 0-100のスコア
}

// バリデーションモード
export type ValidationMode = 'strict' | 'normal' | 'lenient';

// バリデーションコンテキスト
export interface ValidationContext {
  mode: ValidationMode;
  isSubmitting: boolean;
  isEditing: boolean;
  allowPartialValidation: boolean;
}

// バリデーションルール設定
interface ValidationRules {
  projectName: {
    required: boolean;
    minLength: number;
    maxLength: number;
    pattern?: RegExp;
    warningLength?: number;
  };
  industry: {
    required: boolean;
  };
  teamSize: {
    required: boolean;
    min: number;
    max: number;
    warningMin?: number;
    warningMax?: number;
  };
  role: {
    required: boolean;
    maxLength: number;
    minLength?: number;
    pattern?: RegExp;
  };
  startDate: {
    required: boolean;
    futureWarning?: boolean;
    maxPastYears?: number;
  };
  endDate: {
    required: boolean;
    afterStartDate?: boolean;
    futureAllowed?: boolean;
  };
  projectOverview: {
    required?: boolean;
    minLength?: number;
    maxLength: number;
    warningLength?: number;
  };
  responsibilities: {
    required?: boolean;
    minLength?: number;
    maxLength: number;
    warningLength?: number;
  };
  achievements: {
    maxLength: number;
    warningLength?: number;
    suggestedMinLength?: number;
  };
  notes: {
    maxLength: number;
  };
  processes: {
    required: boolean;
    minItems: number;
    maxItems?: number;
  };
  technologies: {
    minTotalItems: number;
    maxItemsPerCategory: number;
    recommendedMinItems?: number;
  };
  companyName: {
    maxLength?: number;
    pattern?: RegExp;
  };
}

const DEFAULT_VALIDATION_RULES: ValidationRules = {
  projectName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    warningLength: 80,
    pattern: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_.,()（）]+$/,
  },
  industry: {
    required: true,
  },
  teamSize: {
    required: true,
    min: 1,
    max: 1000,
    warningMin: 2,
    warningMax: 100,
  },
  role: {
    required: true,
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_.,()（）]+$/,
  },
  startDate: {
    required: true,
    futureWarning: true,
    maxPastYears: 50,
  },
  endDate: {
    required: false,
    afterStartDate: true,
    futureAllowed: true,
  },
  projectOverview: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    warningLength: 800,
  },
  responsibilities: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    warningLength: 800,
  },
  achievements: {
    maxLength: 1000,
    warningLength: 800,
    suggestedMinLength: 20,
  },
  notes: {
    maxLength: 500,
  },
  processes: {
    required: true,
    minItems: 1,
    maxItems: 10,
  },
  technologies: {
    minTotalItems: 1,
    maxItemsPerCategory: 20,
    recommendedMinItems: 3,
  },
  companyName: {
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_.,()（）株式会社有限会社合同会社]+$/,
  },
};

interface UseWorkHistoryValidationOptions {
  rules?: Partial<ValidationRules>;
  realTimeValidation?: boolean;
  context?: Partial<ValidationContext>;
}

export const useWorkHistoryValidation = (options: UseWorkHistoryValidationOptions = {}) => {
  const { 
    rules: customRules = {}, 
    realTimeValidation = false,
    context = {}
  } = options;

  // バリデーションコンテキスト
  const validationContext: ValidationContext = {
    mode: 'normal',
    isSubmitting: false,
    isEditing: false,
    allowPartialValidation: false,
    ...context,
  };

  // バリデーションルールをマージ
  const validationRules = useMemo(() => ({
    ...DEFAULT_VALIDATION_RULES,
    ...customRules,
  }), [customRules]);

  // ヘルパー関数：エラーオブジェクト作成
  const createError = useCallback((field: string, message: string, severity: 'error' | 'warning' | 'info' = 'error', code?: string): ValidationError => ({
    field,
    message,
    severity,
    code,
  }), []);

  // 個別フィールドのバリデーション関数
  const validateProjectName = useCallback((value: string): ValidationError[] => {
    const rules = validationRules.projectName;
    const errors: ValidationError[] = [];
    
    if (rules.required && (!value || value.trim().length === 0)) {
      errors.push(createError('projectName', 'プロジェクト名は必須です', 'error', 'REQUIRED'));
    }
    
    if (value) {
      if (value.length < rules.minLength) {
        errors.push(createError('projectName', `プロジェクト名は${rules.minLength}文字以上で入力してください`, 'error', 'MIN_LENGTH'));
      }
      
      if (value.length > rules.maxLength) {
        errors.push(createError('projectName', `プロジェクト名は${rules.maxLength}文字以内で入力してください`, 'error', 'MAX_LENGTH'));
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(createError('projectName', 'プロジェクト名に使用できない文字が含まれています', 'error', 'INVALID_PATTERN'));
      }
      
      if (rules.warningLength && value.length > rules.warningLength) {
        errors.push(createError('projectName', `プロジェクト名が長すぎます。${rules.warningLength}文字以内を推奨します`, 'warning', 'LENGTH_WARNING'));
      }
    }
    
    return errors;
  }, [validationRules.projectName, createError]);

  const validateIndustry = useCallback((value: number | null): string | null => {
    const rules = validationRules.industry;
    
    if (rules.required && (!value || value <= 0)) {
      return '業種は必須です';
    }
    
    return null;
  }, [validationRules.industry]);

  const validateTeamSize = useCallback((value: number | null): string | null => {
    const rules = validationRules.teamSize;
    
    if (rules.required && (!value || value <= 0)) {
      return 'チーム規模は必須です';
    }
    
    if (value && value < rules.min) {
      return `チーム規模は${rules.min}人以上で入力してください`;
    }
    
    if (value && value > rules.max) {
      return `チーム規模は${rules.max}人以内で入力してください`;
    }
    
    return null;
  }, [validationRules.teamSize]);

  const validateRole = useCallback((value: string): string | null => {
    const rules = validationRules.role;
    
    if (rules.required && (!value || value.trim().length === 0)) {
      return '役割・ポジションは必須です';
    }
    
    if (value && value.length > rules.maxLength) {
      return `役割・ポジションは${rules.maxLength}文字以内で入力してください`;
    }
    
    return null;
  }, [validationRules.role]);

  const validateDates = useCallback((startDate: Date | null, endDate: Date | null): string[] => {
    const errors: string[] = [];
    const startRules = validationRules.startDate;
    const endRules = validationRules.endDate;
    
    // 開始日のバリデーション
    if (startRules.required && !startDate) {
      errors.push('開始日は必須です');
    }
    
    if (startDate && !isValid(startDate)) {
      errors.push('開始日の形式が正しくありません');
    }
    
    // 終了日のバリデーション（現在進行中の場合は不要）
    if (endRules.required && !endDate) {
      errors.push('終了日は必須です');
    }
    
    if (endDate && !isValid(endDate)) {
      errors.push('終了日の形式が正しくありません');
    }
    
    // 期間の整合性チェック
    if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
      if (isBefore(endDate, startDate)) {
        errors.push('終了日は開始日以降の日付を入力してください');
      }
      
      // 期間が異常に長い場合の警告
      const months = differenceInMonths(endDate, startDate);
      if (months > 120) { // 10年
        errors.push('期間が異常に長く設定されています。内容を確認してください');
      }
    }
    
    return errors;
  }, [validationRules.startDate, validationRules.endDate]);

  const validateTextLength = useCallback((value: string, maxLength: number, fieldName: string): string | null => {
    if (value && value.length > maxLength) {
      return `${fieldName}は${maxLength}文字以内で入力してください`;
    }
    return null;
  }, []);

  const validateProcesses = useCallback((processes: number[]): string | null => {
    const rules = validationRules.processes;
    
    if (rules.required && (!processes || processes.length === 0)) {
      return '担当工程は必須です';
    }
    
    if (processes && processes.length < rules.minItems) {
      return `担当工程は最低${rules.minItems}つ選択してください`;
    }
    
    return null;
  }, [validationRules.processes]);

  const validateTechnologies = useCallback((
    programmingLanguages: string[] = [],
    serversDatabases: string[] = [],
    tools: string[] = []
  ): string[] => {
    const errors: string[] = [];
    const rules = validationRules.technologies;
    
    const totalCount = programmingLanguages.length + serversDatabases.length + tools.length;
    
    if (totalCount < rules.minTotalItems) {
      errors.push(`使用技術は最低${rules.minTotalItems}つ入力してください`);
    }
    
    if (programmingLanguages.length > rules.maxItemsPerCategory) {
      errors.push(`プログラミング言語は最大${rules.maxItemsPerCategory}個まで選択可能です`);
    }
    
    if (serversDatabases.length > rules.maxItemsPerCategory) {
      errors.push(`サーバー・DBは最大${rules.maxItemsPerCategory}個まで選択可能です`);
    }
    
    if (tools.length > rules.maxItemsPerCategory) {
      errors.push(`ツールは最大${rules.maxItemsPerCategory}個まで選択可能です`);
    }
    
    return errors;
  }, [validationRules.technologies]);

  // フォーム全体のバリデーション
  const validateForm = useCallback((data: WorkHistoryFormData): WorkHistoryValidationResult => {
    const errors: ValidationError[] = [];
    const fieldErrors: Record<string, string> = {};

    // プロジェクト名
    const projectNameError = validateProjectName(data.projectName || '');
    if (projectNameError) {
      errors.push({ field: 'projectName', message: projectNameError });
      fieldErrors.projectName = projectNameError;
    }

    // 業種
    const industryError = validateIndustry(data.industry);
    if (industryError) {
      errors.push({ field: 'industry', message: industryError });
      fieldErrors.industry = industryError;
    }

    // チーム規模
    const teamSizeError = validateTeamSize(data.teamSize);
    if (teamSizeError) {
      errors.push({ field: 'teamSize', message: teamSizeError });
      fieldErrors.teamSize = teamSizeError;
    }

    // 役割
    const roleError = validateRole(data.role || '');
    if (roleError) {
      errors.push({ field: 'role', message: roleError });
      fieldErrors.role = roleError;
    }

    // 期間
    const dateErrors = validateDates(data.startDate, data.endDate);
    dateErrors.forEach(error => {
      errors.push({ field: 'dates', message: error });
      if (!fieldErrors.dates) fieldErrors.dates = error;
    });

    // テキストフィールドの長さチェック
    const projectOverviewError = validateTextLength(
      data.projectOverview || '', 
      validationRules.projectOverview.maxLength, 
      'プロジェクト概要'
    );
    if (projectOverviewError) {
      errors.push({ field: 'projectOverview', message: projectOverviewError });
      fieldErrors.projectOverview = projectOverviewError;
    }

    const responsibilitiesError = validateTextLength(
      data.responsibilities || '', 
      validationRules.responsibilities.maxLength, 
      '担当業務'
    );
    if (responsibilitiesError) {
      errors.push({ field: 'responsibilities', message: responsibilitiesError });
      fieldErrors.responsibilities = responsibilitiesError;
    }

    const achievementsError = validateTextLength(
      data.achievements || '', 
      validationRules.achievements.maxLength, 
      '成果・実績'
    );
    if (achievementsError) {
      errors.push({ field: 'achievements', message: achievementsError });
      fieldErrors.achievements = achievementsError;
    }

    const notesError = validateTextLength(
      data.notes || '', 
      validationRules.notes.maxLength, 
      '備考'
    );
    if (notesError) {
      errors.push({ field: 'notes', message: notesError });
      fieldErrors.notes = notesError;
    }

    // 担当工程
    const processesError = validateProcesses(data.processes || []);
    if (processesError) {
      errors.push({ field: 'processes', message: processesError });
      fieldErrors.processes = processesError;
    }

    // 使用技術
    const technologyErrors = validateTechnologies(
      data.programmingLanguages,
      data.serversDatabases,
      data.tools
    );
    technologyErrors.forEach(error => {
      errors.push({ field: 'technologies', message: error });
      if (!fieldErrors.technologies) fieldErrors.technologies = error;
    });

    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
    };
  }, [
    validateProjectName,
    validateIndustry,
    validateTeamSize,
    validateRole,
    validateDates,
    validateTextLength,
    validateProcesses,
    validateTechnologies,
    validationRules,
  ]);

  // 個別フィールドのバリデーション（リアルタイム用）
  const validateField = useCallback((fieldName: string, value: unknown, formData?: Partial<WorkHistoryFormData>): string | null => {
    switch (fieldName) {
      case 'projectName':
        return validateProjectName(value as string);
      case 'industry':
        return validateIndustry(value as number);
      case 'teamSize':
        return validateTeamSize(value as number);
      case 'role':
        return validateRole(value as string);
      case 'startDate':
      case 'endDate':
        if (formData) {
          const dateErrors = validateDates(
            fieldName === 'startDate' ? (value as Date) : formData.startDate || null,
            fieldName === 'endDate' ? (value as Date) : formData.endDate || null
          );
          return dateErrors[0] || null;
        }
        return null;
      case 'projectOverview':
        return validateTextLength(value as string, validationRules.projectOverview.maxLength, 'プロジェクト概要');
      case 'responsibilities':
        return validateTextLength(value as string, validationRules.responsibilities.maxLength, '担当業務');
      case 'achievements':
        return validateTextLength(value as string, validationRules.achievements.maxLength, '成果・実績');
      case 'notes':
        return validateTextLength(value as string, validationRules.notes.maxLength, '備考');
      case 'processes':
        return validateProcesses(value as number[]);
      default:
        return null;
    }
  }, [
    validateProjectName,
    validateIndustry,
    validateTeamSize,
    validateRole,
    validateDates,
    validateTextLength,
    validateProcesses,
    validationRules,
  ]);

  return {
    // バリデーション関数
    validateForm,
    validateField,
    
    // 個別バリデーション関数
    validateProjectName,
    validateIndustry,
    validateTeamSize,
    validateRole,
    validateDates,
    validateProcesses,
    validateTechnologies,
    
    // 設定
    validationRules,
    realTimeValidation,
  };
};

export default useWorkHistoryValidation;