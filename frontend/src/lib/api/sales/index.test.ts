import {
  proposalApi,
  contractExtensionApi,
  interviewApi,
  emailApi,
  pocSyncApi,
  salesTeamApi
} from './index';
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
  PaginatedResponse,
  ApiResponse
} from '@/types/sales';

// APIクライアントのモック
const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

// モック設定
jest.mock('@/lib/axios', () => ({
  apiClient: mockApiClient
}));

jest.mock('@/constants/sales', () => ({
  SALES_ENDPOINTS: {
    proposals: '/api/v1/sales/proposals',
    proposalDetail: (id: string) => `/api/v1/sales/proposals/${id}`,
    proposalStatus: (id: string) => `/api/v1/sales/proposals/${id}/status`,
    activeProposalsByEngineer: (engineerId: string) => `/api/v1/sales/proposals/engineers/${engineerId}/active`,
    parallelProposals: '/api/v1/sales/proposals/parallel',
    proposalStatistics: '/api/v1/sales/proposals/statistics',
    upcomingDeadlines: '/api/v1/sales/proposals/deadlines/upcoming',
    extensions: '/api/v1/sales/extensions',
    extensionDetail: (id: string) => `/api/v1/sales/extensions/${id}`,
    extensionStatus: (id: string) => `/api/v1/sales/extensions/${id}/status`,
    extensionTargets: '/api/v1/sales/extensions/targets',
    latestExtensionByEngineer: (engineerId: string) => `/api/v1/sales/extensions/engineers/${engineerId}/latest`,
    pendingExtensions: '/api/v1/sales/extensions/pending',
    autoCreateExtensions: '/api/v1/sales/extensions/auto-create',
    extensionSettings: '/api/v1/sales/extensions/settings',
    interviews: '/api/v1/sales/interviews',
    interviewDetail: (id: string) => `/api/v1/sales/interviews/${id}`,
    interviewStatus: (id: string) => `/api/v1/sales/interviews/${id}/status`,
    calendarView: '/api/v1/sales/interviews/calendar',
    upcomingInterviews: '/api/v1/sales/interviews/upcoming',
    interviewsByProposal: (proposalId: string) => `/api/v1/sales/interviews/proposals/${proposalId}`,
    checkConflicts: '/api/v1/sales/interviews/conflicts/check',
    interviewReminderSettings: '/api/v1/sales/interviews/reminder-settings',
    emailTemplates: '/api/v1/sales/emails/templates',
    emailTemplateDetail: (id: string) => `/api/v1/sales/emails/templates/${id}`,
    emailCampaigns: '/api/v1/sales/emails/campaigns',
    emailCampaignDetail: (id: string) => `/api/v1/sales/emails/campaigns/${id}`,
    sendCampaign: (id: string) => `/api/v1/sales/emails/campaigns/${id}/send`,
    campaignStats: (id: string) => `/api/v1/sales/emails/campaigns/${id}/stats`,
    campaignHistory: (id: string) => `/api/v1/sales/emails/campaigns/${id}/history`,
    sendProposalEmail: '/api/v1/sales/emails/proposal',
    sendInterviewConfirmation: (interviewId: string) => `/api/v1/sales/emails/interviews/${interviewId}/confirmation`,
    sendExtensionRequest: (extensionId: string) => `/api/v1/sales/emails/extensions/${extensionId}/request`,
    syncAll: '/api/v1/sales/poc-sync/sync/all',
    syncProject: (pocProjectId: string) => `/api/v1/sales/poc-sync/sync/projects/${pocProjectId}`,
    forceSync: '/api/v1/sales/poc-sync/sync/force',
    scheduledSync: '/api/v1/sales/poc-sync/sync/scheduled',
    syncStatus: '/api/v1/sales/poc-sync/status',
    unsyncedProjects: '/api/v1/sales/poc-sync/unsynced',
    syncHistory: '/api/v1/sales/poc-sync/history',
    pocProjects: '/api/v1/sales/poc-sync/projects',
    pocProjectDetail: (id: string) => `/api/v1/sales/poc-sync/projects/${id}`,
    pocSyncSettings: '/api/v1/sales/poc-sync/settings',
    teamMembers: '/api/v1/sales/team/members',
    teamMemberRole: (userId: string) => `/api/v1/sales/team/members/${userId}/role`,
    teamMemberDetail: (userId: string) => `/api/v1/sales/team/members/${userId}`,
    userPermissions: (userId?: string) => userId ? `/api/v1/sales/team/permissions/users/${userId}` : '/api/v1/sales/team/permissions',
    grantPermission: '/api/v1/sales/team/permissions',
    revokePermission: (permissionId: string) => `/api/v1/sales/team/permissions/${permissionId}`,
    checkPermission: '/api/v1/sales/team/check-permission',
    checkAccess: '/api/v1/sales/team/check-access',
    accessibleProposals: '/api/v1/sales/team/accessible/proposals',
    accessibleInterviews: '/api/v1/sales/team/accessible/interviews',
    accessibleExtensions: '/api/v1/sales/team/accessible/extensions',
    teamSettings: '/api/v1/sales/team/settings'
  }
}));

// モックデータ
const mockProposal: Proposal = {
  id: '1',
  engineerId: 'eng1',
  engineerName: '田中太郎',
  clientId: 'client1',
  clientName: '株式会社ABC',
  proposalAmount: 700000,
  amountType: 'monthly',
  status: 'pending',
  proposalDate: '2024-01-15',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  createdBy: 'user1'
};

const mockCreateProposalRequest: CreateProposalRequest = {
  engineerId: 'eng1',
  clientId: 'client1',
  proposalAmount: 700000,
  amountType: 'monthly'
};

const mockPaginatedResponse: PaginatedResponse<Proposal> = {
  items: [mockProposal],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1
};

const mockApiResponse: ApiResponse<Proposal> = {
  data: mockProposal
};

const mockContractExtension: ContractExtension = {
  id: '1',
  engineerId: 'eng1',
  engineerName: '田中太郎',
  currentContractEnd: '2024-03-31',
  extensionCheckDate: '2024-01-01',
  status: 'pending',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user1'
};

const mockInterviewSchedule: InterviewSchedule = {
  id: '1',
  proposalId: 'proposal1',
  engineerName: '田中太郎',
  clientName: '株式会社ABC',
  scheduledDate: '2024-01-20T10:00:00Z',
  durationMinutes: 60,
  meetingType: 'online',
  clientAttendees: [],
  engineerAttendees: [],
  status: 'scheduled',
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
  createdBy: 'user1'
};

describe('Sales API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('proposalApi', () => {
    describe('getList', () => {
      it('フィルターなしで提案一覧を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await proposalApi.getList();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/proposals?');
        expect(result).toEqual(mockPaginatedResponse);
      });

      it('フィルター付きで提案一覧を取得できる', async () => {
        const filter: ProposalListFilter = {
          status: ['pending', 'in_interview'],
          page: 1,
          limit: 10
        };
        mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

        const result = await proposalApi.getList(filter);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/sales/proposals?')
        );
        expect(result).toEqual(mockPaginatedResponse);
      });

      it('配列値を正しくクエリパラメータに変換する', async () => {
        const filter: ProposalListFilter = {
          status: ['pending', 'accepted']
        };
        mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

        await proposalApi.getList(filter);

        const callArgs = mockApiClient.get.mock.calls[0][0];
        expect(callArgs).toContain('status=pending');
        expect(callArgs).toContain('status=accepted');
      });

      it('null/undefined値をフィルターから除外する', async () => {
        const filter: ProposalListFilter = {
          status: ['pending'],
          engineerId: undefined,
          clientId: null
        };
        mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

        await proposalApi.getList(filter);

        const callArgs = mockApiClient.get.mock.calls[0][0];
        expect(callArgs).toContain('status=pending');
        expect(callArgs).not.toContain('engineerId');
        expect(callArgs).not.toContain('clientId');
      });
    });

    describe('getById', () => {
      it('指定されたIDの提案詳細を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: mockApiResponse });

        const result = await proposalApi.getById('1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/proposals/1');
        expect(result).toEqual(mockProposal);
      });
    });

    describe('create', () => {
      it('新しい提案を作成できる', async () => {
        mockApiClient.post.mockResolvedValue({ data: mockApiResponse });

        const result = await proposalApi.create(mockCreateProposalRequest);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/sales/proposals',
          mockCreateProposalRequest
        );
        expect(result).toEqual(mockProposal);
      });
    });

    describe('update', () => {
      it('提案を更新できる', async () => {
        const updateData = { proposalAmount: 800000 };
        mockApiClient.put.mockResolvedValue({ data: mockApiResponse });

        const result = await proposalApi.update('1', updateData);

        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/1',
          updateData
        );
        expect(result).toEqual(mockProposal);
      });
    });

    describe('updateStatus', () => {
      it('提案のステータスを更新できる', async () => {
        mockApiClient.put.mockResolvedValue({});

        await proposalApi.updateStatus('1', 'accepted');

        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/1/status',
          { status: 'accepted' }
        );
      });
    });

    describe('delete', () => {
      it('提案を削除できる', async () => {
        mockApiClient.delete.mockResolvedValue({});

        await proposalApi.delete('1');

        expect(mockApiClient.delete).toHaveBeenCalledWith('/api/v1/sales/proposals/1');
      });
    });

    describe('getActiveByEngineer', () => {
      it('エンジニア別のアクティブ提案を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: [mockProposal] } });

        const result = await proposalApi.getActiveByEngineer('eng1');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/engineers/eng1/active'
        );
        expect(result).toEqual([mockProposal]);
      });

      it('データが空の場合は空配列を返す', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: null } });

        const result = await proposalApi.getActiveByEngineer('eng1');

        expect(result).toEqual([]);
      });
    });

    describe('getStatistics', () => {
      it('提案統計を取得できる', async () => {
        const mockStats: ProposalStatistics = {
          totalProposals: 100,
          activeProposals: 20,
          acceptanceRate: 0.15,
          averageAmount: 750000,
          statusCounts: {
            draft: 5,
            pending: 15,
            in_interview: 10,
            accepted: 15,
            rejected: 50,
            cancelled: 5
          },
          monthlyTrends: []
        };
        mockApiClient.get.mockResolvedValue({ data: mockStats });

        const result = await proposalApi.getStatistics();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/proposals/statistics');
        expect(result).toEqual(mockStats);
      });

      it('クライアントIDを指定して統計を取得できる', async () => {
        const mockStats: ProposalStatistics = {
          totalProposals: 50,
          activeProposals: 10,
          acceptanceRate: 0.2,
          averageAmount: 800000,
          statusCounts: {
            draft: 2,
            pending: 8,
            in_interview: 5,
            accepted: 10,
            rejected: 20,
            cancelled: 5
          },
          monthlyTrends: []
        };
        mockApiClient.get.mockResolvedValue({ data: mockStats });

        const result = await proposalApi.getStatistics('client1');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/statistics?client_id=client1'
        );
        expect(result).toEqual(mockStats);
      });
    });

    describe('getUpcomingDeadlines', () => {
      it('期限間近の提案を取得できる（デフォルト7日）', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: [mockProposal] } });

        const result = await proposalApi.getUpcomingDeadlines();

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/deadlines/upcoming?days=7'
        );
        expect(result).toEqual([mockProposal]);
      });

      it('カスタム日数で期限間近の提案を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: [mockProposal] } });

        const result = await proposalApi.getUpcomingDeadlines(3);

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/sales/proposals/deadlines/upcoming?days=3'
        );
        expect(result).toEqual([mockProposal]);
      });
    });
  });

  describe('contractExtensionApi', () => {
    describe('getList', () => {
      it('延長確認一覧を取得できる', async () => {
        const mockResponse: PaginatedResponse<ContractExtension> = {
          items: [mockContractExtension],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        };
        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await contractExtensionApi.getList();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/extensions?');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getTargets', () => {
      it('延長確認対象者を取得できる', async () => {
        const mockTargets: ExtensionTarget[] = [
          {
            engineerId: 'eng1',
            engineerName: '田中太郎',
            currentContractEnd: '2024-03-31',
            daysUntilExpiry: 30,
            needsCheck: true
          }
        ];
        mockApiClient.get.mockResolvedValue({ data: { data: mockTargets } });

        const result = await contractExtensionApi.getTargets();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/extensions/targets');
        expect(result).toEqual(mockTargets);
      });
    });

    describe('autoCreate', () => {
      it('自動作成を実行できる', async () => {
        mockApiClient.post.mockResolvedValue({});

        await contractExtensionApi.autoCreate();

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/sales/extensions/auto-create');
      });
    });

    describe('getSettings', () => {
      it('延長確認設定を取得できる', async () => {
        const mockSettings: ContractExtensionSettings = {
          checkBeforeDays: 30,
          reminderEnabled: true,
          reminderDays: '7,3,1',
          autoNotification: true,
          notificationChannels: 'email,slack'
        };
        mockApiClient.get.mockResolvedValue({ data: { data: mockSettings } });

        const result = await contractExtensionApi.getSettings();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/extensions/settings');
        expect(result).toEqual(mockSettings);
      });
    });

    describe('updateSettings', () => {
      it('延長確認設定を更新できる', async () => {
        const settings: ContractExtensionSettings = {
          checkBeforeDays: 45,
          reminderEnabled: false,
          reminderDays: '7,1',
          autoNotification: false,
          notificationChannels: 'email'
        };
        mockApiClient.put.mockResolvedValue({});

        await contractExtensionApi.updateSettings(settings);

        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/sales/extensions/settings',
          settings
        );
      });
    });
  });

  describe('interviewApi', () => {
    describe('getCalendarView', () => {
      it('カレンダービューを取得できる', async () => {
        const mockEvents: CalendarEvent[] = [
          {
            id: '1',
            title: '面談 - 田中太郎',
            start: '2024-01-20T10:00:00Z',
            end: '2024-01-20T11:00:00Z',
            type: 'interview',
            status: 'scheduled'
          }
        ];
        mockApiClient.get.mockResolvedValue({ data: { data: mockEvents } });

        const result = await interviewApi.getCalendarView('2024-01-01', '2024-01-31');

        expect(mockApiClient.get).toHaveBeenCalledWith(
          '/api/v1/sales/interviews/calendar?start_date=2024-01-01&end_date=2024-01-31'
        );
        expect(result).toEqual(mockEvents);
      });
    });

    describe('checkConflicts', () => {
      it('重複チェックを実行できる', async () => {
        const checkData = {
          scheduledDate: '2024-01-20T10:00:00Z',
          durationMinutes: 60
        };
        const mockResult: ConflictCheckResult = {
          hasConflict: false,
          conflicts: []
        };
        mockApiClient.post.mockResolvedValue({ data: mockResult });

        const result = await interviewApi.checkConflicts(checkData);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/sales/interviews/conflicts/check',
          checkData
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('getReminderSettings', () => {
      it('リマインダー設定を取得できる', async () => {
        const mockSettings = { enabled: true, daysBefore: 1 };
        mockApiClient.get.mockResolvedValue({ data: mockSettings });

        const result = await interviewApi.getReminderSettings();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/interviews/reminder-settings');
        expect(result).toEqual(mockSettings);
      });
    });
  });

  describe('emailApi', () => {
    describe('templates', () => {
      it('テンプレート一覧を取得できる', async () => {
        const mockTemplate: EmailTemplate = {
          id: '1',
          name: '提案メールテンプレート',
          subject: '提案書のご送付',
          bodyHtml: '<h1>提案書</h1>',
          variables: [],
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          createdBy: 'user1'
        };
        const mockResponse: PaginatedResponse<EmailTemplate> = {
          items: [mockTemplate],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        };
        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await emailApi.templates.getList();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/emails/templates?');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('campaigns', () => {
      it('キャンペーン統計を取得できる', async () => {
        const mockStats: CampaignStats = {
          totalSent: 100,
          successRate: 0.95,
          bounceRate: 0.02,
          responses: 15
        };
        mockApiClient.get.mockResolvedValue({ data: mockStats });

        const result = await emailApi.campaigns.getStats('1');

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/emails/campaigns/1/stats');
        expect(result).toEqual(mockStats);
      });

      it('キャンペーンを送信できる', async () => {
        mockApiClient.post.mockResolvedValue({});

        await emailApi.campaigns.send('1');

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/sales/emails/campaigns/1/send');
      });
    });

    describe('sendProposal', () => {
      it('提案メールを送信できる', async () => {
        const emailData = {
          proposalId: '1',
          recipientEmail: 'client@duesk.co.jp'
        };
        mockApiClient.post.mockResolvedValue({});

        await emailApi.sendProposal(emailData);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/sales/emails/proposal',
          emailData
        );
      });
    });
  });

  describe('pocSyncApi', () => {
    describe('syncAll', () => {
      it('全同期を実行できる', async () => {
        mockApiClient.post.mockResolvedValue({});

        await pocSyncApi.syncAll();

        expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/sales/poc-sync/sync/all');
      });
    });

    describe('getStatus', () => {
      it('同期ステータスを取得できる', async () => {
        const mockStatus = {
          isRunning: false,
          lastSyncAt: '2024-01-15T00:00:00Z',
          nextScheduledAt: '2024-01-16T00:00:00Z'
        };
        mockApiClient.get.mockResolvedValue({ data: mockStatus });

        const result = await pocSyncApi.getStatus();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/poc-sync/status');
        expect(result).toEqual(mockStatus);
      });
    });

    describe('getHistory', () => {
      it('同期履歴を取得できる（デフォルト50件）', async () => {
        const mockHistory: SyncHistory[] = [
          {
            id: '1',
            syncType: 'scheduled',
            status: 'success',
            projectsProcessed: 10,
            projectsCreated: 2,
            projectsUpdated: 8,
            projectsFailed: 0,
            duration: 30000,
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z'
          }
        ];
        mockApiClient.get.mockResolvedValue({ data: { data: mockHistory } });

        const result = await pocSyncApi.getHistory();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/poc-sync/history?limit=50');
        expect(result).toEqual(mockHistory);
      });

      it('カスタム件数で同期履歴を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: [] } });

        await pocSyncApi.getHistory(100);

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/poc-sync/history?limit=100');
      });
    });
  });

  describe('salesTeamApi', () => {
    describe('getMembers', () => {
      it('チームメンバー一覧を取得できる', async () => {
        const mockMember: SalesTeamMember = {
          id: '1',
          userId: 'user1',
          userName: '営業太郎',
          email: 'sales@duesk.co.jp',
          role: 'sales_member',
          permissions: [],
          isActive: true,
          joinedAt: '2024-01-01',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        };
        const mockResponse: PaginatedResponse<SalesTeamMember> = {
          items: [mockMember],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        };
        mockApiClient.get.mockResolvedValue({ data: mockResponse });

        const result = await salesTeamApi.getMembers();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/team/members?');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('checkPermission', () => {
      it('権限チェックを実行できる', async () => {
        const permissionData = {
          resource: 'proposals',
          action: 'read'
        };
        mockApiClient.post.mockResolvedValue({ data: { has_permission: true } });

        const result = await salesTeamApi.checkPermission(permissionData);

        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/api/v1/sales/team/check-permission',
          permissionData
        );
        expect(result).toBe(true);
      });

      it('権限がない場合はfalseを返す', async () => {
        const permissionData = {
          resource: 'proposals',
          action: 'delete'
        };
        mockApiClient.post.mockResolvedValue({ data: { has_permission: false } });

        const result = await salesTeamApi.checkPermission(permissionData);

        expect(result).toBe(false);
      });
    });

    describe('getAccessibleProposals', () => {
      it('アクセス可能な提案一覧を取得できる', async () => {
        mockApiClient.get.mockResolvedValue({ data: { data: [mockProposal] } });

        const result = await salesTeamApi.getAccessibleProposals();

        expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/team/accessible/proposals');
        expect(result).toEqual([mockProposal]);
      });
    });

    describe('updateSettings', () => {
      it('チーム設定を更新できる', async () => {
        const settings: SalesTeamSettings = {
          autoAssignNewMembers: true,
          defaultRole: 'sales_member',
          requireApprovalForHigh: true,
          notificationChannels: 'email,slack',
          accessLogRetentionDays: 90
        };
        mockApiClient.put.mockResolvedValue({});

        await salesTeamApi.updateSettings(settings);

        expect(mockApiClient.put).toHaveBeenCalledWith(
          '/api/v1/sales/team/settings',
          settings
        );
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラーを適切にthrowする', async () => {
      const error = new Error('Network Error');
      mockApiClient.get.mockRejectedValue(error);

      await expect(proposalApi.getList()).rejects.toThrow('Network Error');
    });

    it('データが存在しない場合にデフォルト値を返す', async () => {
      mockApiClient.get.mockResolvedValue({ data: { data: null } });

      const result = await proposalApi.getActiveByEngineer('eng1');

      expect(result).toEqual([]);
    });

    it('空のレスポンスを適切に処理する', async () => {
      mockApiClient.get.mockResolvedValue({ data: {} });

      const result = await pocSyncApi.getUnsynced();

      expect(result).toEqual([]);
    });
  });

  describe('URLパラメータの組み立て', () => {
    it('複雑なフィルターオブジェクトを正しくクエリパラメータに変換する', async () => {
      const filter = {
        status: ['pending', 'approved'],
        engineerId: 'eng1',
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31',
        page: 2,
        limit: 10
      };
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      await contractExtensionApi.getList(filter);

      const callUrl = mockApiClient.get.mock.calls[0][0];
      expect(callUrl).toContain('status=pending');
      expect(callUrl).toContain('status=approved');
      expect(callUrl).toContain('engineerId=eng1');
      expect(callUrl).toContain('dateFrom=2024-01-01');
      expect(callUrl).toContain('dateTo=2024-01-31');
      expect(callUrl).toContain('page=2');
      expect(callUrl).toContain('limit=10');
    });

    it('空のフィルターオブジェクトを正しく処理する', async () => {
      mockApiClient.get.mockResolvedValue({ data: mockPaginatedResponse });

      await interviewApi.getList({});

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/sales/interviews?');
    });
  });
});