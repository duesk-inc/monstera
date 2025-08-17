// 営業関連のAPIクライアント

// Migrated to new API client system
import { createPresetApiClient } from '@/lib/api';
import { SALES_ENDPOINTS } from '@/constants/sales';
import type {
  Proposal,
  CreateProposalRequest,
  ProposalListFilter,
  ProposalStatistics,
  ContractExtension,
  ExtensionTarget,
  ContractExtensionSettings,
  InterviewSchedule,
  CalendarEvent,
  ConflictCheckResult,
  EmailTemplate,
  EmailCampaign,
  CampaignStats,
  PocProject,
  SyncHistory,
  SyncSettings,
  SalesTeamMember,
  SalesPermission,
  SalesTeamSettings,
  ApiResponse,
  PaginatedResponse
} from '@/types/sales';

// 提案管理API
export const proposalApi = {
  // 提案一覧取得
  getList: async (filter?: ProposalListFilter): Promise<PaginatedResponse<Proposal>> => {
    const client = createPresetApiClient('auth');
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const response = await client.get<PaginatedResponse<Proposal>>(
      `${SALES_ENDPOINTS.proposals}?${params.toString()}`
    );
    return response.data;
  },

  // 提案詳細取得
  getById: async (id: string): Promise<Proposal> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<Proposal>>(
      SALES_ENDPOINTS.proposalDetail(id)
    );
    return response.data.data!;
  },

  // 提案作成
  create: async (data: CreateProposalRequest): Promise<Proposal> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<ApiResponse<Proposal>>(
      SALES_ENDPOINTS.proposals,
      data
    );
    return response.data.data!;
  },

  // 提案更新
  update: async (id: string, data: Partial<CreateProposalRequest>): Promise<Proposal> => {
    const client = createPresetApiClient('auth');
    const response = await client.put<ApiResponse<Proposal>>(
      SALES_ENDPOINTS.proposalDetail(id),
      data
    );
    return response.data.data!;
  },

  // ステータス更新
  updateStatus: async (id: string, status: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.proposalStatus(id), { status });
  },

  // 提案削除
  delete: async (id: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.delete(SALES_ENDPOINTS.proposalDetail(id));
  },

  // エンジニア別アクティブ提案取得
  getActiveByEngineer: async (engineerId: string): Promise<Proposal[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<Proposal[]>>(
      SALES_ENDPOINTS.activeProposalsByEngineer(engineerId)
    );
    return response.data.data || [];
  },

  // 並行提案情報取得
  getParallel: async (): Promise<any> => {
    const client = createPresetApiClient('auth');
    const response = await client.get(SALES_ENDPOINTS.parallelProposals);
    return response.data;
  },

  // 提案統計取得
  getStatistics: async (clientId?: string): Promise<ProposalStatistics> => {
    const client = createPresetApiClient('auth');
    const params = clientId ? `?client_id=${clientId}` : '';
    const response = await client.get<ProposalStatistics>(
      `${SALES_ENDPOINTS.proposalStatistics}${params}`
    );
    return response.data;
  },

  // 期限間近の提案取得
  getUpcomingDeadlines: async (days: number = 7): Promise<Proposal[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<Proposal[]>>(
      `${SALES_ENDPOINTS.upcomingDeadlines}?days=${days}`
    );
    return response.data.data || [];
  }
};

// 契約延長管理API
export const contractExtensionApi = {
  // 延長確認一覧取得
  getList: async (filter?: any): Promise<PaginatedResponse<ContractExtension>> => {
    const client = createPresetApiClient('auth');
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await client.get<PaginatedResponse<ContractExtension>>(
      `${SALES_ENDPOINTS.extensions}?${params.toString()}`
    );
    return response.data;
  },

  // 延長確認詳細取得
  getById: async (id: string): Promise<ContractExtension> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ContractExtension>>(
      SALES_ENDPOINTS.extensionDetail(id)
    );
    return response.data.data!;
  },

  // 延長確認作成
  create: async (data: any): Promise<ContractExtension> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<ApiResponse<ContractExtension>>(
      SALES_ENDPOINTS.extensions,
      data
    );
    return response.data.data!;
  },

  // 延長確認更新
  update: async (id: string, data: any): Promise<ContractExtension> => {
    const client = createPresetApiClient('auth');
    const response = await client.put<ApiResponse<ContractExtension>>(
      SALES_ENDPOINTS.extensionDetail(id),
      data
    );
    return response.data.data!;
  },

  // ステータス更新
  updateStatus: async (id: string, status: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.extensionStatus(id), { status });
  },

  // 延長確認削除
  delete: async (id: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.delete(SALES_ENDPOINTS.extensionDetail(id));
  },

  // 延長確認対象者取得
  getTargets: async (): Promise<ExtensionTarget[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ExtensionTarget[]>>(
      SALES_ENDPOINTS.extensionTargets
    );
    return response.data.data || [];
  },

  // エンジニア別最新延長確認取得
  getLatestByEngineer: async (engineerId: string): Promise<ContractExtension> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ContractExtension>>(
      SALES_ENDPOINTS.latestExtensionByEngineer(engineerId)
    );
    return response.data.data!;
  },

  // 未確認の延長確認取得
  getPending: async (): Promise<ContractExtension[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ContractExtension[]>>(
      SALES_ENDPOINTS.pendingExtensions
    );
    return response.data.data || [];
  },

  // 自動作成実行
  autoCreate: async (): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.autoCreateExtensions);
  },

  // 設定取得
  getSettings: async (): Promise<ContractExtensionSettings> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ContractExtensionSettings>>(
      SALES_ENDPOINTS.extensionSettings
    );
    return response.data.data!;
  },

  // 設定更新
  updateSettings: async (settings: ContractExtensionSettings): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.extensionSettings, settings);
  }
};

// 面談スケジュール管理API
export const interviewApi = {
  // 面談一覧取得
  getList: async (filter?: any): Promise<PaginatedResponse<InterviewSchedule>> => {
    const client = createPresetApiClient('auth');
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await client.get<PaginatedResponse<InterviewSchedule>>(
      `${SALES_ENDPOINTS.interviews}?${params.toString()}`
    );
    return response.data;
  },

  // 面談詳細取得
  getById: async (id: string): Promise<InterviewSchedule> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<InterviewSchedule>>(
      SALES_ENDPOINTS.interviewDetail(id)
    );
    return response.data.data!;
  },

  // 面談作成
  create: async (data: any): Promise<InterviewSchedule> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<ApiResponse<InterviewSchedule>>(
      SALES_ENDPOINTS.interviews,
      data
    );
    return response.data.data!;
  },

  // 面談更新
  update: async (id: string, data: any): Promise<InterviewSchedule> => {
    const client = createPresetApiClient('auth');
    const response = await client.put<ApiResponse<InterviewSchedule>>(
      SALES_ENDPOINTS.interviewDetail(id),
      data
    );
    return response.data.data!;
  },

  // ステータス更新
  updateStatus: async (id: string, status: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.interviewStatus(id), { status });
  },

  // 面談削除
  delete: async (id: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.delete(SALES_ENDPOINTS.interviewDetail(id));
  },

  // カレンダービュー取得
  getCalendarView: async (startDate: string, endDate: string): Promise<CalendarEvent[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<CalendarEvent[]>>(
      `${SALES_ENDPOINTS.calendarView}?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data.data || [];
  },

  // 今後の面談取得
  getUpcoming: async (): Promise<InterviewSchedule[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<InterviewSchedule[]>>(
      SALES_ENDPOINTS.upcomingInterviews
    );
    return response.data.data || [];
  },

  // 提案別面談取得
  getByProposal: async (proposalId: string): Promise<InterviewSchedule[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<InterviewSchedule[]>>(
      SALES_ENDPOINTS.interviewsByProposal(proposalId)
    );
    return response.data.data || [];
  },

  // 重複チェック
  checkConflicts: async (data: any): Promise<ConflictCheckResult> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<ConflictCheckResult>(
      SALES_ENDPOINTS.checkConflicts,
      data
    );
    return response.data;
  },

  // リマインダー設定取得
  getReminderSettings: async (): Promise<any> => {
    const client = createPresetApiClient('auth');
    const response = await client.get(SALES_ENDPOINTS.interviewReminderSettings);
    return response.data;
  },

  // リマインダー設定更新
  updateReminderSettings: async (settings: any): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.interviewReminderSettings, settings);
  }
};

// メール管理API
export const emailApi = {
  // テンプレート管理
  templates: {
    getList: async (filter?: any): Promise<PaginatedResponse<EmailTemplate>> => {
      const client = createPresetApiClient('auth');
      const params = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await client.get<PaginatedResponse<EmailTemplate>>(
        `${SALES_ENDPOINTS.emailTemplates}?${params.toString()}`
      );
      return response.data;
    },

    getById: async (id: string): Promise<EmailTemplate> => {
      const client = createPresetApiClient('auth');
      const response = await client.get<ApiResponse<EmailTemplate>>(
        SALES_ENDPOINTS.emailTemplateDetail(id)
      );
      return response.data.data!;
    },

    create: async (data: any): Promise<EmailTemplate> => {
      const client = createPresetApiClient('auth');
      const response = await client.post<ApiResponse<EmailTemplate>>(
        SALES_ENDPOINTS.emailTemplates,
        data
      );
      return response.data.data!;
    },

    update: async (id: string, data: any): Promise<EmailTemplate> => {
      const client = createPresetApiClient('auth');
      const response = await client.put<ApiResponse<EmailTemplate>>(
        SALES_ENDPOINTS.emailTemplateDetail(id),
        data
      );
      return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
      const client = createPresetApiClient('auth');
      await client.delete(SALES_ENDPOINTS.emailTemplateDetail(id));
    }
  },

  // キャンペーン管理
  campaigns: {
    getList: async (filter?: any): Promise<PaginatedResponse<EmailCampaign>> => {
      const client = createPresetApiClient('auth');
      const params = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
      }

      const response = await client.get<PaginatedResponse<EmailCampaign>>(
        `${SALES_ENDPOINTS.emailCampaigns}?${params.toString()}`
      );
      return response.data;
    },

    getById: async (id: string): Promise<EmailCampaign> => {
      const client = createPresetApiClient('auth');
      const response = await client.get<ApiResponse<EmailCampaign>>(
        SALES_ENDPOINTS.emailCampaignDetail(id)
      );
      return response.data.data!;
    },

    create: async (data: any): Promise<EmailCampaign> => {
      const client = createPresetApiClient('auth');
      const response = await client.post<ApiResponse<EmailCampaign>>(
        SALES_ENDPOINTS.emailCampaigns,
        data
      );
      return response.data.data!;
    },

    update: async (id: string, data: any): Promise<EmailCampaign> => {
      const client = createPresetApiClient('auth');
      const response = await client.put<ApiResponse<EmailCampaign>>(
        SALES_ENDPOINTS.emailCampaignDetail(id),
        data
      );
      return response.data.data!;
    },

    delete: async (id: string): Promise<void> => {
      const client = createPresetApiClient('auth');
      await client.delete(SALES_ENDPOINTS.emailCampaignDetail(id));
    },

    send: async (id: string): Promise<void> => {
      const client = createPresetApiClient('auth');
      await client.post(SALES_ENDPOINTS.sendCampaign(id));
    },

    getStats: async (id: string): Promise<CampaignStats> => {
      const client = createPresetApiClient('auth');
      const response = await client.get<CampaignStats>(
        SALES_ENDPOINTS.campaignStats(id)
      );
      return response.data;
    },

    getHistory: async (id: string): Promise<any[]> => {
      const client = createPresetApiClient('auth');
      const response = await client.get<ApiResponse<any[]>>(
        SALES_ENDPOINTS.campaignHistory(id)
      );
      return response.data.data || [];
    }
  },

  // メール送信
  sendProposal: async (data: any): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.sendProposalEmail, data);
  },

  sendInterviewConfirmation: async (interviewId: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.sendInterviewConfirmation(interviewId));
  },

  sendExtensionRequest: async (extensionId: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.sendExtensionRequest(extensionId));
  }
};

// POC同期管理API
export const pocSyncApi = {
  // 同期処理
  syncAll: async (): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.syncAll);
  },

  syncProject: async (pocProjectId: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.syncProject(pocProjectId));
  },

  forceSync: async (): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.forceSync);
  },

  runScheduled: async (): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.scheduledSync);
  },

  // 状況管理
  getStatus: async (): Promise<any> => {
    const client = createPresetApiClient('auth');
    const response = await client.get(SALES_ENDPOINTS.syncStatus);
    return response.data;
  },

  getUnsynced: async (): Promise<PocProject[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<PocProject[]>>(
      SALES_ENDPOINTS.unsyncedProjects
    );
    return response.data.data || [];
  },

  getHistory: async (limit: number = 50): Promise<SyncHistory[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<SyncHistory[]>>(
      `${SALES_ENDPOINTS.syncHistory}?limit=${limit}`
    );
    return response.data.data || [];
  },

  // プロジェクト管理
  createProject: async (data: any): Promise<PocProject> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<ApiResponse<PocProject>>(
      SALES_ENDPOINTS.pocProjects,
      data
    );
    return response.data.data!;
  },

  updateProject: async (id: string, data: any): Promise<PocProject> => {
    const client = createPresetApiClient('auth');
    const response = await client.put<ApiResponse<PocProject>>(
      SALES_ENDPOINTS.pocProjectDetail(id),
      data
    );
    return response.data.data!;
  },

  // 設定管理
  getSettings: async (): Promise<SyncSettings> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<SyncSettings>>(
      SALES_ENDPOINTS.pocSyncSettings
    );
    return response.data.data!;
  },

  updateSettings: async (settings: SyncSettings): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.pocSyncSettings, settings);
  }
};

// 営業チーム管理API
export const salesTeamApi = {
  // メンバー管理
  getMembers: async (filter?: any): Promise<PaginatedResponse<SalesTeamMember>> => {
    const client = createPresetApiClient('auth');
    const params = new URLSearchParams();
    if (filter) {
      Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await client.get<PaginatedResponse<SalesTeamMember>>(
      `${SALES_ENDPOINTS.teamMembers}?${params.toString()}`
    );
    return response.data;
  },

  addMember: async (data: any): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.teamMembers, data);
  },

  removeMember: async (userId: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.delete(SALES_ENDPOINTS.teamMemberDetail(userId));
  },

  updateMemberRole: async (userId: string, role: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.teamMemberRole(userId), { role });
  },

  // 権限管理
  getUserPermissions: async (userId?: string): Promise<SalesPermission[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<SalesPermission[]>>(
      SALES_ENDPOINTS.userPermissions(userId)
    );
    return response.data.data || [];
  },

  grantPermission: async (data: any): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.post(SALES_ENDPOINTS.grantPermission, data);
  },

  revokePermission: async (permissionId: string): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.delete(SALES_ENDPOINTS.revokePermission(permissionId));
  },

  // アクセス制御
  checkPermission: async (data: any): Promise<boolean> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<{ has_permission: boolean }>(
      SALES_ENDPOINTS.checkPermission,
      data
    );
    return response.data.has_permission;
  },

  checkAccess: async (data: any): Promise<boolean> => {
    const client = createPresetApiClient('auth');
    const response = await client.post<{ can_access: boolean }>(
      SALES_ENDPOINTS.checkAccess,
      data
    );
    return response.data.can_access;
  },

  // アクセス可能データ取得
  getAccessibleProposals: async (): Promise<Proposal[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<Proposal[]>>(
      SALES_ENDPOINTS.accessibleProposals
    );
    return response.data.data || [];
  },

  getAccessibleInterviews: async (): Promise<InterviewSchedule[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<InterviewSchedule[]>>(
      SALES_ENDPOINTS.accessibleInterviews
    );
    return response.data.data || [];
  },

  getAccessibleExtensions: async (): Promise<ContractExtension[]> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<ContractExtension[]>>(
      SALES_ENDPOINTS.accessibleExtensions
    );
    return response.data.data || [];
  },

  // 設定管理
  getSettings: async (): Promise<SalesTeamSettings> => {
    const client = createPresetApiClient('auth');
    const response = await client.get<ApiResponse<SalesTeamSettings>>(
      SALES_ENDPOINTS.teamSettings
    );
    return response.data.data!;
  },

  updateSettings: async (settings: SalesTeamSettings): Promise<void> => {
    const client = createPresetApiClient('auth');
    await client.put(SALES_ENDPOINTS.teamSettings, settings);
  }
};

// 個別エクスポート（互換性のため）
export const emailTemplateApi = emailApi.templates;
export const emailCampaignApi = emailApi.campaigns;
export const pocProjectApi = pocSyncApi;

// ユーザーAPI（プレースホルダー）
export const userApi = {
  getAll: async () => ({ data: [] }),
  getById: async (id: string) => ({ data: null }),
  create: async (data: any) => ({ data: null }),
  update: async (id: string, data: any) => ({ data: null }),
  delete: async (id: string) => {},
};