/**
 * スキルシート関連の型定義
 */

import { WorkHistory } from './profile';

/**
 * スキルシート情報の型定義
 */
export interface SkillSheet {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  workHistories: WorkHistory[];
  technicalSkills: TechnicalSkill[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 技術スキルの型定義
 */
export interface TechnicalSkill {
  categoryId?: string;
  categoryName: string;
  displayName: string;
  technologies: string[];
}

/**
 * スキルシートフォームデータの型定義
 */
export interface SkillSheetFormData {
  // 職務経歴
  workHistory: {
    projectName: string;
    startDate: Date | null;
    endDate: Date | null;
    industry: number;
    projectOverview: string;
    responsibilities: string;
    achievements: string;
    notes: string;
    processes: number[];
    technologies: string;
    programmingLanguages: string[];
    serversDatabases: string[];
    tools: string[];
    teamSize: number;
    role: string;
  }[];
}

/**
 * スキルシート一時保存リクエストの型定義
 */
export interface SkillSheetTempSaveRequest {
  workHistory: {
    projectName: string;
    startDate: string;
    endDate: string;
    industry: number;
    projectOverview: string;
    responsibilities: string;
    achievements: string;
    notes: string;
    processes: number[];
    technologies: string;
    programmingLanguages: string[];
    serversDatabases: string[];
    tools: string[];
    teamSize: number;
    role: string;
  }[];
}

/**
 * APIレスポンスの型定義
 */
export interface SkillSheetApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}