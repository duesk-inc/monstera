import { useState, useCallback, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { ProfileFormData, UserProfile, WorkHistory } from '@/types/profile';

interface UseFormStateReturn {
  formMethods: ReturnType<typeof useForm<ProfileFormData>>;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  isTempSaved: boolean;
  setIsTempSaved: (value: boolean) => void;
  tempSavedAt: string | null;
  setTempSavedAt: (value: string | null) => void;
  tempSaveNotified: boolean;
  setTempSaveNotified: (value: boolean) => void;
}

// YYYY-MM形式の文字列をDateオブジェクトに変換するヘルパー関数
const parseAcquiredDate = (acquiredDate: string): Date | null => {
  if (!acquiredDate) return null;
  
  try {
    const [year, month] = acquiredDate.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return null;
    
    return new Date(year, month - 1, 1);
  } catch (error) {
    return null;
  }
};

/**
 * プロフィールフォームの状態管理専用フック
 * React Hook FormとローカルUIステートのみを管理
 */
export const useFormState = (
  profile: UserProfile | null, 
  workHistories?: WorkHistory[]
): UseFormStateReturn => {
  // 送信中フラグ
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 一時保存状態
  const [isTempSaved, setIsTempSaved] = useState(profile?.isTempSaved || false);
  const [tempSavedAt, setTempSavedAt] = useState<string | null>(profile?.tempSavedAt || null);
  
  // 一時保存データの通知状態
  const [tempSaveNotified, setTempSaveNotified] = useState(false);

  // 資格情報の変換処理をメモ化
  const processedCertifications = useMemo(() => {
    if (!profile?.certifications || profile.certifications.length === 0) {
      return [{ name: '', acquiredAt: null }];
    }
    
    return profile.certifications.map(cert => ({
      name: cert.name,
      acquiredAt: cert.acquiredDate ? parseAcquiredDate(cert.acquiredDate) : null
    }));
  }, [profile?.certifications]);

  // 職務経歴の変換処理をメモ化
  const processedWorkHistory = useMemo(() => {
    if (!workHistories || workHistories.length === 0) {
      return [{
        projectName: '',
        startDate: null,
        endDate: null,
        industry: '',
        projectOverview: '',
        responsibilities: '',
        achievements: '',
        notes: '',
        processes: [],
        technologies: '',
        programmingLanguages: [],
        serversDatabases: [],
        tools: [],
        teamSize: 0,
        role: '',
      }];
    }

    return workHistories.map(wh => ({
      projectName: wh.projectName,
      startDate: wh.startDate ? new Date(wh.startDate.substring(0, 7) + '-01') : null,
      endDate: wh.endDate ? new Date(wh.endDate.substring(0, 7) + '-01') : null,
      industry: wh.industry,
      projectOverview: wh.projectOverview,
      responsibilities: wh.responsibilities,
      achievements: wh.achievements,
      notes: wh.notes,
      processes: Array.isArray(wh.processes) ? wh.processes : [],
      technologies: wh.technologies,
      programmingLanguages: wh.programmingLanguages || [],
      serversDatabases: wh.serversDatabases || [],
      tools: wh.tools || [],
      teamSize: wh.teamSize,
      role: wh.role,
    }));
  }, [workHistories]);

  // フォームの初期値をメモ化
  const defaultValues = useMemo((): ProfileFormData => ({
    education: profile?.education || '',
    nearestStation: profile?.nearestStation || '',
    canTravel: profile?.canTravel || 3,
    certifications: processedCertifications,
    appealPoints: profile?.appealPoints || '',
    workHistory: processedWorkHistory,
  }), [
    profile?.education,
    profile?.nearestStation, 
    profile?.canTravel,
    profile?.appealPoints,
    processedCertifications,
    processedWorkHistory
  ]);

  // フォームの状態管理
  const formMethods = useForm<ProfileFormData>({
    defaultValues: defaultValues,
  });

  // プロファイルデータが変更されたら、フォームの値を更新
  useEffect(() => {
    if (profile) {
      formMethods.reset(defaultValues, { 
        keepDefaultValues: true,
        keepValues: false,
        keepErrors: false,
        keepDirty: false,
        keepIsSubmitted: false,
        keepTouched: false,
        keepIsValid: false,
        keepSubmitCount: false
      });
      
      setTimeout(() => {
        formMethods.setValue('certifications', defaultValues.certifications);
        formMethods.setValue('workHistory', defaultValues.workHistory);
      }, 0);
    }
  }, [profile, workHistories, formMethods, defaultValues]);

  // プロファイルデータが変更されたとき
  useEffect(() => {
    if (profile) {
      const newIsTempSaved = profile.isTempSaved || false;
      const newTempSavedAt = profile.tempSavedAt || null;
      
      setIsTempSaved(newIsTempSaved);
      setTempSavedAt(newTempSavedAt);
    }
  }, [profile]);

  return {
    formMethods,
    isSubmitting,
    setIsSubmitting,
    isTempSaved,
    setIsTempSaved,
    tempSavedAt,
    setTempSavedAt,
    tempSaveNotified,
    setTempSaveNotified,
  };
};