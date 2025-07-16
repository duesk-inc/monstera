import { useMemo } from 'react';
import { usePermission, Permission, Role } from '../common/usePermission';
import { useAuth } from '../useAuth';

/**
 * 提案機能専用の権限チェックフック
 * 提案機能の各操作に対する権限チェックを提供
 */
export const useProposalPermissions = () => {
  const { hasPermission, hasAnyPermission, hasRole } = usePermission();
  const { user } = useAuth();

  // エンジニア権限のチェック
  const isEngineer = useMemo(() => 
    hasRole(Role.ENGINEER) || hasRole(Role.SUPER_ADMIN) || hasRole(Role.ADMIN), 
    [hasRole]
  );

  // 営業権限のチェック
  const isSales = useMemo(() => 
    hasRole(Role.SALES) || hasRole(Role.SUPER_ADMIN) || hasRole(Role.ADMIN), 
    [hasRole]
  );

  // 管理者権限のチェック
  const isAdmin = useMemo(() => 
    hasRole(Role.ADMIN) || hasRole(Role.SUPER_ADMIN), 
    [hasRole]
  );

  // 提案表示権限
  const canViewProposals = useMemo(() => 
    hasPermission(Permission.PROPOSAL_VIEW), 
    [hasPermission]
  );

  // 提案回答権限（エンジニア）
  const canRespondToProposals = useMemo(() => 
    hasPermission(Permission.PROPOSAL_RESPOND), 
    [hasPermission]
  );

  // 提案管理権限（営業・管理者）
  const canManageProposals = useMemo(() => 
    hasPermission(Permission.PROPOSAL_MANAGE), 
    [hasPermission]
  );

  // 提案統計表示権限
  const canViewProposalStats = useMemo(() => 
    hasPermission(Permission.PROPOSAL_STATS), 
    [hasPermission]
  );

  // 質問投稿権限（エンジニア）
  const canCreateQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_CREATE), 
    [hasPermission]
  );

  // 質問編集権限（エンジニア、自分の質問のみ）
  const canEditQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_EDIT), 
    [hasPermission]
  );

  // 質問削除権限（エンジニア、自分の質問のみ）
  const canDeleteQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_DELETE), 
    [hasPermission]
  );

  // 質問回答権限（営業・管理者）
  const canRespondToQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_RESPOND), 
    [hasPermission]
  );

  // 質問割り当て権限（営業・管理者）
  const canAssignQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_ASSIGN), 
    [hasPermission]
  );

  // 全質問表示権限（営業・管理者）
  const canViewAllQuestions = useMemo(() => 
    hasPermission(Permission.QUESTION_VIEW_ALL), 
    [hasPermission]
  );

  // 特定の質問を編集できるかチェック（作成者本人または管理者）
  const canEditQuestion = (questionCreatorId?: string) => {
    if (!questionCreatorId || !user?.id) return false;
    
    // 管理者は全ての質問を編集可能
    if (isAdmin) return true;
    
    // エンジニアは自分の質問のみ編集可能
    if (isEngineer && questionCreatorId === user.id && canEditQuestions) {
      return true;
    }
    
    return false;
  };

  // 特定の質問を削除できるかチェック（作成者本人または管理者）
  const canDeleteQuestion = (questionCreatorId?: string) => {
    if (!questionCreatorId || !user?.id) return false;
    
    // 管理者は全ての質問を削除可能
    if (isAdmin) return true;
    
    // エンジニアは自分の質問のみ削除可能
    if (isEngineer && questionCreatorId === user.id && canDeleteQuestions) {
      return true;
    }
    
    return false;
  };

  // 特定の提案にアクセスできるかチェック（エンジニア：自分の提案、営業・管理者：全ての提案）
  const canAccessProposal = (proposalUserId?: string) => {
    if (!proposalUserId || !user?.id) return false;
    
    // 管理者と営業は全ての提案にアクセス可能
    if (isAdmin || (isSales && canManageProposals)) return true;
    
    // エンジニアは自分の提案のみアクセス可能
    if (isEngineer && proposalUserId === user.id && canViewProposals) {
      return true;
    }
    
    return false;
  };

  // 24時間制限チェック（質問の編集・削除）
  const canEditWithinTimeLimit = (createdAt: string) => {
    const createTime = new Date(createdAt).getTime();
    const currentTime = Date.now();
    const hoursDiff = (currentTime - createTime) / (1000 * 60 * 60);
    
    return hoursDiff <= 24;
  };

  // 質問の編集可能性を包括的にチェック
  const canEditQuestionComprehensive = (questionCreatorId?: string, createdAt?: string) => {
    if (!canEditQuestion(questionCreatorId)) return false;
    if (!createdAt) return false;
    
    // 管理者は時間制限なし
    if (isAdmin) return true;
    
    // エンジニアは24時間制限あり
    return canEditWithinTimeLimit(createdAt);
  };

  // 質問の削除可能性を包括的にチェック
  const canDeleteQuestionComprehensive = (questionCreatorId?: string, createdAt?: string) => {
    if (!canDeleteQuestion(questionCreatorId)) return false;
    if (!createdAt) return false;
    
    // 管理者は時間制限なし
    if (isAdmin) return true;
    
    // エンジニアは24時間制限あり
    return canEditWithinTimeLimit(createdAt);
  };

  return {
    // ロール判定
    isEngineer,
    isSales,
    isAdmin,
    
    // 基本権限
    canViewProposals,
    canRespondToProposals,
    canManageProposals,
    canViewProposalStats,
    canCreateQuestions,
    canEditQuestions,
    canDeleteQuestions,
    canRespondToQuestions,
    canAssignQuestions,
    canViewAllQuestions,
    
    // 詳細権限チェック関数
    canEditQuestion,
    canDeleteQuestion,
    canAccessProposal,
    canEditWithinTimeLimit,
    canEditQuestionComprehensive,
    canDeleteQuestionComprehensive,
    
    // ユーザー情報
    currentUserId: user?.id,
  };
};

/**
 * 提案機能の権限チェック結果をコンパクトに返すフック
 */
export const useProposalPermissionStatus = () => {
  const permissions = useProposalPermissions();
  
  return {
    hasProposalAccess: permissions.canViewProposals,
    hasQuestionAccess: permissions.canCreateQuestions || permissions.canRespondToQuestions,
    hasManagementAccess: permissions.canManageProposals || permissions.canViewAllQuestions,
    userRole: permissions.isEngineer ? 'engineer' : 
              permissions.isSales ? 'sales' : 
              permissions.isAdmin ? 'admin' : 'unknown',
  };
};