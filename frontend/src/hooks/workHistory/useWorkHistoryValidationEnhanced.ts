import { useMemo, useCallback } from 'react';
import { isValid, isBefore, isAfter, differenceInMonths, differenceInYears } from 'date-fns';
import type { WorkHistoryFormData } from '../../types/workHistory';

// バリデーションエラーの型定義
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code: string;
}

export interface WorkHistoryValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  fieldErrors: Record<string, ValidationError[]>;
  warnings: ValidationError[];
  hasWarnings: boolean;
  overallScore: number; // 0-100のスコア
  completionRate: number; // 入力完了率
}

// バリデーションモード
export type ValidationMode = 'strict' | 'normal' | 'lenient';

// バリデーションコンテキスト
export interface ValidationContext {
  mode: ValidationMode;
  isSubmitting: boolean;
  isEditing: boolean;
  allowPartialValidation: boolean;
  skipOptionalFields: boolean;
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

export const useWorkHistoryValidationEnhanced = (options: UseWorkHistoryValidationOptions = {}) => {
  const { 
    rules: customRules = {}, 
    context = {}
  } = options;

  // バリデーションコンテキスト
  const validationContext: ValidationContext = {
    mode: 'normal',
    isSubmitting: false,
    isEditing: false,
    allowPartialValidation: false,
    skipOptionalFields: false,
    ...context,
  };

  // バリデーションルールをマージ
  const validationRules = useMemo(() => ({
    ...DEFAULT_VALIDATION_RULES,
    ...customRules,
  }), [customRules]);

  // ヘルパー関数：エラーオブジェクト作成
  const createError = useCallback((
    field: string, 
    message: string, 
    severity: 'error' | 'warning' | 'info' = 'error', 
    code: string
  ): ValidationError => ({
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

  const validateIndustry = useCallback((value: number | null): ValidationError[] => {
    const rules = validationRules.industry;
    const errors: ValidationError[] = [];
    
    if (rules.required && (!value || value <= 0)) {
      errors.push(createError('industry', '業種の選択は必須です', 'error', 'REQUIRED'));
    }
    
    return errors;
  }, [validationRules.industry, createError]);

  const validateTeamSize = useCallback((value: number | null): ValidationError[] => {
    const rules = validationRules.teamSize;
    const errors: ValidationError[] = [];
    
    if (rules.required && (!value || value <= 0)) {
      errors.push(createError('teamSize', 'チーム規模は必須です', 'error', 'REQUIRED'));
    }
    
    if (value) {
      if (value < rules.min) {
        errors.push(createError('teamSize', `チーム規模は${rules.min}人以上で入力してください`, 'error', 'MIN_VALUE'));
      }
      
      if (value > rules.max) {
        errors.push(createError('teamSize', `チーム規模は${rules.max}人以内で入力してください`, 'error', 'MAX_VALUE'));
      }
      
      if (rules.warningMin && value < rules.warningMin) {
        errors.push(createError('teamSize', `チーム規模が小さすぎる可能性があります。${rules.warningMin}人以上を推奨します`, 'warning', 'SIZE_WARNING_MIN'));
      }
      
      if (rules.warningMax && value > rules.warningMax) {
        errors.push(createError('teamSize', `チーム規模が大きすぎる可能性があります。${rules.warningMax}人以内を推奨します`, 'warning', 'SIZE_WARNING_MAX'));
      }
    }
    
    return errors;
  }, [validationRules.teamSize, createError]);

  const validateRole = useCallback((value: string): ValidationError[] => {
    const rules = validationRules.role;
    const errors: ValidationError[] = [];
    
    if (rules.required && (!value || value.trim().length === 0)) {
      errors.push(createError('role', '役割・ポジションは必須です', 'error', 'REQUIRED'));
    }
    
    if (value) {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(createError('role', `役割・ポジションは${rules.minLength}文字以上で入力してください`, 'error', 'MIN_LENGTH'));
      }
      
      if (value.length > rules.maxLength) {
        errors.push(createError('role', `役割・ポジションは${rules.maxLength}文字以内で入力してください`, 'error', 'MAX_LENGTH'));
      }
      
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(createError('role', '役割・ポジションに使用できない文字が含まれています', 'error', 'INVALID_PATTERN'));
      }
    }
    
    return errors;
  }, [validationRules.role, createError]);

  const validateDates = useCallback((startDate: Date | null, endDate: Date | null): ValidationError[] => {
    const errors: ValidationError[] = [];
    const startRules = validationRules.startDate;
    const endRules = validationRules.endDate;
    const now = new Date();
    
    // 開始日のバリデーション
    if (startRules.required && !startDate) {
      errors.push(createError('startDate', '開始日は必須です', 'error', 'REQUIRED'));
    }
    
    if (startDate && !isValid(startDate)) {
      errors.push(createError('startDate', '開始日の形式が正しくありません', 'error', 'INVALID_DATE'));
    }
    
    if (startDate && isValid(startDate)) {
      // 未来日の警告
      if (startRules.futureWarning && isAfter(startDate, now)) {
        errors.push(createError('startDate', '開始日が未来の日付になっています', 'warning', 'FUTURE_DATE'));
      }
      
      // 過去すぎる日付の警告
      if (startRules.maxPastYears && differenceInYears(now, startDate) > startRules.maxPastYears) {
        errors.push(createError('startDate', `開始日が${startRules.maxPastYears}年以上前の日付になっています`, 'warning', 'TOO_OLD'));
      }
    }
    
    // 終了日のバリデーション
    if (endRules.required && !endDate) {
      errors.push(createError('endDate', '終了日は必須です', 'error', 'REQUIRED'));
    }
    
    if (endDate && !isValid(endDate)) {
      errors.push(createError('endDate', '終了日の形式が正しくありません', 'error', 'INVALID_DATE'));
    }
    
    // 期間の整合性チェック
    if (startDate && endDate && isValid(startDate) && isValid(endDate)) {
      if (endRules.afterStartDate && isBefore(endDate, startDate)) {
        errors.push(createError('endDate', '終了日は開始日より後の日付で入力してください', 'error', 'END_BEFORE_START'));
      }
      
      if (!endRules.futureAllowed && isAfter(endDate, now)) {
        errors.push(createError('endDate', '終了日が未来の日付になっています', 'warning', 'FUTURE_DATE'));
      }
      
      // プロジェクト期間の警告
      const durationMonths = differenceInMonths(endDate, startDate);
      if (durationMonths < 1) {
        errors.push(createError('endDate', 'プロジェクト期間が短すぎる可能性があります', 'warning', 'SHORT_DURATION'));
      }
      
      if (durationMonths > 120) { // 10年以上
        errors.push(createError('endDate', 'プロジェクト期間が長すぎる可能性があります', 'warning', 'LONG_DURATION'));
      }
    }
    
    return errors;
  }, [validationRules.startDate, validationRules.endDate, createError]);

  const validateTextArea = useCallback((
    value: string, 
    fieldName: string, 
    rules: { required?: boolean; minLength?: number; maxLength: number; warningLength?: number; }
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (rules.required && (!value || value.trim().length === 0)) {
      const displayName = fieldName === 'projectOverview' ? 'プロジェクト概要' :
                          fieldName === 'responsibilities' ? '担当業務' :
                          fieldName === 'achievements' ? '実績・成果' :
                          fieldName === 'notes' ? '備考' : fieldName;
      errors.push(createError(fieldName, `${displayName}は必須です`, 'error', 'REQUIRED'));
    }
    
    if (value) {
      if (rules.minLength && value.length < rules.minLength) {
        const displayName = fieldName === 'projectOverview' ? 'プロジェクト概要' :
                            fieldName === 'responsibilities' ? '担当業務' : fieldName;
        errors.push(createError(fieldName, `${displayName}は${rules.minLength}文字以上で入力してください`, 'error', 'MIN_LENGTH'));
      }
      
      if (value.length > rules.maxLength) {
        const displayName = fieldName === 'projectOverview' ? 'プロジェクト概要' :
                            fieldName === 'responsibilities' ? '担当業務' :
                            fieldName === 'achievements' ? '実績・成果' :
                            fieldName === 'notes' ? '備考' : fieldName;
        errors.push(createError(fieldName, `${displayName}は${rules.maxLength}文字以内で入力してください`, 'error', 'MAX_LENGTH'));
      }
      
      if (rules.warningLength && value.length > rules.warningLength) {
        const displayName = fieldName === 'projectOverview' ? 'プロジェクト概要' :
                            fieldName === 'responsibilities' ? '担当業務' :
                            fieldName === 'achievements' ? '実績・成果' : fieldName;
        errors.push(createError(fieldName, `${displayName}が長すぎます。${rules.warningLength}文字以内を推奨します`, 'warning', 'LENGTH_WARNING'));
      }
    }
    
    return errors;
  }, [createError]);

  const validateArrayField = useCallback((
    value: unknown[] | undefined, 
    fieldName: string,
    rules: { required?: boolean; minItems?: number; maxItems?: number; }
  ): ValidationError[] => {
    const errors: ValidationError[] = [];
    const arrayValue = value || [];
    
    if (rules.required && arrayValue.length === 0) {
      const displayName = fieldName === 'processes' ? '工程' :
                          fieldName === 'technologies' ? '技術' : fieldName;
      errors.push(createError(fieldName, `${displayName}を最低1つ選択してください`, 'error', 'REQUIRED'));
    }
    
    if (rules.minItems && arrayValue.length < rules.minItems) {
      const displayName = fieldName === 'processes' ? '工程' :
                          fieldName === 'technologies' ? '技術' : fieldName;
      errors.push(createError(fieldName, `${displayName}を最低${rules.minItems}つ選択してください`, 'error', 'MIN_ITEMS'));
    }
    
    if (rules.maxItems && arrayValue.length > rules.maxItems) {
      const displayName = fieldName === 'processes' ? '工程' :
                          fieldName === 'technologies' ? '技術' : fieldName;
      errors.push(createError(fieldName, `${displayName}は最大${rules.maxItems}つまで選択可能です`, 'error', 'MAX_ITEMS'));
    }
    
    return errors;
  }, [createError]);

  // 総合バリデーション関数
  const validateForm = useCallback((formData: WorkHistoryFormData): WorkHistoryValidationResult => {
    const allErrors: ValidationError[] = [];
    
    // 各フィールドのバリデーション
    allErrors.push(...validateProjectName(formData.projectName || ''));
    allErrors.push(...validateIndustry(formData.industry));
    allErrors.push(...validateTeamSize(formData.teamSize));
    allErrors.push(...validateRole(formData.role || ''));
    allErrors.push(...validateDates(formData.startDate, formData.endDate));
    
    // テキストエリアフィールド
    allErrors.push(...validateTextArea(formData.projectOverview || '', 'projectOverview', validationRules.projectOverview));
    allErrors.push(...validateTextArea(formData.responsibilities || '', 'responsibilities', validationRules.responsibilities));
    allErrors.push(...validateTextArea(formData.achievements || '', 'achievements', validationRules.achievements));
    allErrors.push(...validateTextArea(formData.notes || '', 'notes', validationRules.notes));
    
    // 配列フィールド
    allErrors.push(...validateArrayField(formData.processes, 'processes', validationRules.processes));
    
    // 技術スタックの総合チェック
    const totalTechnologies = (formData.programmingLanguages?.length || 0) +
                              (formData.serversDatabases?.length || 0) +
                              (formData.tools?.length || 0);
    
    if (totalTechnologies < validationRules.technologies.minTotalItems) {
      allErrors.push(createError('technologies', `技術を合計${validationRules.technologies.minTotalItems}つ以上選択してください`, 'error', 'MIN_TOTAL_TECHNOLOGIES'));
    }
    
    if (validationRules.technologies.recommendedMinItems && totalTechnologies < validationRules.technologies.recommendedMinItems) {
      allErrors.push(createError('technologies', `技術をより多く選択することを推奨します（推奨：${validationRules.technologies.recommendedMinItems}つ以上）`, 'warning', 'RECOMMENDED_TECHNOLOGIES'));
    }
    
    // 会社名（オプション）
    if (formData.companyName) {
      const companyRules = validationRules.companyName;
      if (companyRules.maxLength && formData.companyName.length > companyRules.maxLength) {
        allErrors.push(createError('companyName', `会社名は${companyRules.maxLength}文字以内で入力してください`, 'error', 'MAX_LENGTH'));
      }
      
      if (companyRules.pattern && !companyRules.pattern.test(formData.companyName)) {
        allErrors.push(createError('companyName', '会社名に使用できない文字が含まれています', 'error', 'INVALID_PATTERN'));
      }
    }
    
    // エラーを分類
    const errors = allErrors.filter(error => error.severity === 'error');
    const warnings = allErrors.filter(error => error.severity === 'warning');
    
    // フィールドエラーマップを作成
    const fieldErrors: Record<string, ValidationError[]> = {};
    allErrors.forEach(error => {
      if (!fieldErrors[error.field]) {
        fieldErrors[error.field] = [];
      }
      fieldErrors[error.field].push(error);
    });
    
    // スコア計算（0-100）
    const totalFields = Object.keys(validationRules).length;
    const fieldsWithErrors = new Set(errors.map(error => error.field)).size;
    const fieldsWithWarnings = new Set(warnings.map(warning => warning.field)).size;
    
    const errorPenalty = (fieldsWithErrors / totalFields) * 50;
    const warningPenalty = (fieldsWithWarnings / totalFields) * 20;
    const overallScore = Math.max(0, 100 - errorPenalty - warningPenalty);
    
    // 入力完了率計算
    const requiredFields = [
      formData.projectName,
      formData.industry,
      formData.teamSize,
      formData.role,
      formData.startDate,
      formData.projectOverview,
      formData.responsibilities,
      formData.processes?.length,
      totalTechnologies > 0,
    ];
    
    const completedFields = requiredFields.filter(field => {
      if (typeof field === 'boolean') return field;
      if (typeof field === 'number') return field > 0;
      if (typeof field === 'string') return field.trim().length > 0;
      return !!field;
    }).length;
    
    const completionRate = (completedFields / requiredFields.length) * 100;
    
    return {
      isValid: errors.length === 0,
      errors,
      fieldErrors,
      warnings,
      hasWarnings: warnings.length > 0,
      overallScore: Math.round(overallScore),
      completionRate: Math.round(completionRate),
    };
  }, [
    validateProjectName,
    validateIndustry,
    validateTeamSize,
    validateRole,
    validateDates,
    validateTextArea,
    validateArrayField,
    validationRules,
    createError,
  ]);

  // 単一フィールドのバリデーション
  const validateField = useCallback((fieldName: string, value: unknown, formData?: WorkHistoryFormData): ValidationError[] => {
    switch (fieldName) {
      case 'projectName':
        return validateProjectName(value as string);
      case 'industry':
        return validateIndustry(value as number | null);
      case 'teamSize':
        return validateTeamSize(value as number | null);
      case 'role':
        return validateRole(value as string);
      case 'startDate':
      case 'endDate':
        if (formData) {
          return validateDates(formData.startDate, formData.endDate).filter(error => error.field === fieldName);
        }
        return [];
      case 'projectOverview':
        return validateTextArea(value as string, fieldName, validationRules.projectOverview);
      case 'responsibilities':
        return validateTextArea(value as string, fieldName, validationRules.responsibilities);
      case 'achievements':
        return validateTextArea(value as string, fieldName, validationRules.achievements);
      case 'notes':
        return validateTextArea(value as string, fieldName, validationRules.notes);
      case 'processes':
        return validateArrayField(value as unknown[], fieldName, validationRules.processes);
      default:
        return [];
    }
  }, [
    validateProjectName,
    validateIndustry,
    validateTeamSize,
    validateRole,
    validateDates,
    validateTextArea,
    validateArrayField,
    validationRules,
  ]);

  return {
    validateForm,
    validateField,
    validationRules,
    validationContext,
  };
};