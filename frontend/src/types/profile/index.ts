/**
 * プロフィール情報の型定義
 */
export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  firstNameKana: string;
  lastNameKana: string;
  birthdate: string | null;
  gender: string;
  address: string;
  phoneNumber: string;
  education: string;
  nearestStation: string;
  canTravel: number; // 1: 可能, 2: 不可, 3: 要相談
  appealPoints: string;
  role: string;
  isTempSaved?: boolean;
  tempSavedAt?: string | null;
  currentVersion?: number;
  certifications?: Certification[];
  languageSkills?: LanguageSkill[];
  frameworkSkills?: FrameworkSkill[];
  businessExps?: BusinessExperience[];
}

/**
 * 資格・認定証の型定義
 */
export interface Certification {
  id: string;
  name: string;
  acquiredDate: string; // YYYY-MM形式
  expiryDate?: string | null;
}

/**
 * 言語スキルの型定義
 */
export interface LanguageSkill {
  id: string;
  name: string;
  level: number;
  yearsOfExperience: number;
  months: number;
}

/**
 * フレームワークスキルの型定義
 */
export interface FrameworkSkill {
  id: string;
  name: string;
  level: number;
  yearsOfExperience: number;
  months: number;
}

/**
 * 業務経験の型定義
 */
export interface BusinessExperience {
  id: string;
  industry: string;
  experienceDetail: string;
  yearsOfExperience: number;
}

export interface WorkHistory {
  id: string;
  projectName: string;
  startDate: string;
  endDate: string | null;
  industry: number;
  projectOverview: string;
  responsibilities: string;
  achievements: string;
  notes: string;
  processes: number[];
  technologies: string;
  programmingLanguages?: string[];
  serversDatabases?: string[];
  tools?: string[];
  teamSize: number;
  role: string;
}

export interface ProfileWithWorkHistory {
  profile: UserProfile;
  workHistories: WorkHistory[];
}

/**
 * プロフィール履歴の型定義
 */
export interface ProfileHistory {
  id: string;
  profileId: string;
  userId: string;
  education: string;
  nearestStation: string;
  canTravel: string;
  appealPoints: string;
  version: number;
  createdAt: string;
  workHistories: WorkHistoryHistory[];
}

export interface WorkHistoryHistory {
  id: string;
  historyId: string;
  profileHistoryId: string;
  userId: string;
  projectName: string;
  startDate: string;
  endDate: string | null;
  industry: number;
  projectOverview: string;
  role: string;
  teamSize: number;
  projectProcesses: string;
  createdAt: string;
}

/**
 * プロフィールフォームデータの型定義（基本プロフィール専用）
 * 職務経歴はスキルシート画面で管理するため除外
 */
export interface ProfileFormData {
  // 基本情報
  education: string;
  nearestStation: string;
  canTravel: number; // 1: 可能, 2: 不可, 3: 要相談
  
  // スキル情報
  certifications: {
    name: string;
    acquiredAt: Date | null;
  }[];
  appealPoints: string;
  
  // 職務経歴
  workHistory: {
    projectName: string;
    startDate: Date | null;
    endDate: Date | null;
    industry: string;
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
 * 技術カテゴリの型定義
 */
export interface TechnologyCategory {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
}

/**
 * APIレスポンスの型定義
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
} 