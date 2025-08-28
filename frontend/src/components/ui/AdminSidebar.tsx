"use client";

import React from "react";
import {
  Dashboard as DashboardIcon,
  Engineering as EngineerIcon,
  Business as BusinessManagementIcon,
  TrendingUp as SalesIcon,
  AccountBalance as AccountingIcon,
  Settings as SettingsIcon,
  // サブメニュー用アイコン
  People as PeopleIcon,
  Assignment as WeeklyReportIcon,
  AccessTime as AttendanceIcon,
  Receipt as ExpenseApprovalIcon,
  NotificationImportant as ReminderIcon,
  EventBusy as LeaveIcon,
  Support as FollowUpIcon,
  Description as SkillSheetIcon,
  Store as ClientIcon,
  ReceiptLong as InvoiceIcon,
  ShowChart as PipelineIcon,
  RequestQuote as ProposalIcon,
  QuestionAnswer as EngineerProposalIcon,
  AccountBalanceWallet as AccountingDashboardIcon,
  FileCopy as BillingIcon,
  FolderSpecial as ProjectGroupIcon,
  CloudSync as FreeeIcon,
  SettingsApplications as GeneralSettingsIcon,
  VerifiedUser as ApproverSettingsIcon,
} from "@mui/icons-material";
import { User } from '@/types/auth';
import { BaseSidebar, MenuItem } from '@/components/common/sidebar/BaseSidebar';

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = (props) => {
  // デバッグ: propsの確認
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('AdminSidebar Props:', {
        hasUser: !!props.user,
        userEmail: props.user?.email,
        userRole: props.user?.role,
        collapsed: props.collapsed,
        mobile: props.mobile,
        fullUserObject: props.user
      });
    }
  }, [props]);
  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      path: "/admin/dashboard",
      icon: <DashboardIcon />,
    },
    {
      title: "エンジニア管理",
      icon: <EngineerIcon />,
      children: [
        {
          title: "社員情報",
          path: "/admin/engineers",
          icon: <PeopleIcon />,
        },
        {
          title: "週報管理",
          path: "/admin/engineers/weekly-reports",
          icon: <WeeklyReportIcon />,
          badge: 5,
        },
        {
          title: "勤怠承認",
          path: "/admin/engineers/attendance",
          icon: <AttendanceIcon />,
          badge: 3,
        },
        {
          title: "経費承認",
          path: "/admin/engineers/expenses",
          icon: <ExpenseApprovalIcon />,
          badge: 2,
        },
        {
          title: "承認催促管理",
          path: "/admin/approval-reminder",
          icon: <ReminderIcon />,
        },
        {
          title: "休暇申請管理",
          path: "/admin/leave",
          icon: <LeaveIcon />,
          badge: 0,
        },
        {
          title: "フォローアップ対象",
          path: "/admin/engineers/follow-up",
          icon: <FollowUpIcon />,
        },
        {
          title: "スキルシート",
          path: "/admin/engineers/skill-sheets",
          icon: <SkillSheetIcon />,
        },
      ],
    },
    {
      title: "ビジネス管理",
      icon: <BusinessManagementIcon />,
      children: [
        {
          title: "取引先管理",
          path: "/admin/business/clients",
          icon: <ClientIcon />,
        },
        {
          title: "請求管理",
          path: "/admin/business/invoices",
          icon: <InvoiceIcon />,
        },
      ],
    },
    {
      title: "営業管理",
      icon: <SalesIcon />,
      children: [
        {
          title: "営業パイプライン",
          path: "/admin/sales/pipeline",
          icon: <PipelineIcon />,
        },
        {
          title: "提案管理",
          path: "/sales/proposals",
          icon: <ProposalIcon />,
        },
        {
          title: "エンジニア提案回答",
          path: "/engineer-proposals",
          icon: <EngineerProposalIcon />,
          badge: 0,
        },
      ],
    },
    {
      title: "経理管理",
      icon: <AccountingIcon />,
      children: [
        {
          title: "ダッシュボード",
          path: "/admin/accounting",
          icon: <AccountingDashboardIcon />,
        },
        {
          title: "請求書一覧",
          path: "/admin/accounting/invoices",
          icon: <InvoiceIcon />,
        },
        {
          title: "月次請求処理",
          path: "/admin/accounting/billing",
          icon: <BillingIcon />,
        },
        {
          title: "プロジェクトグループ",
          path: "/admin/accounting/project-groups",
          icon: <ProjectGroupIcon />,
        },
        {
          title: "freee連携",
          path: "/admin/accounting/freee/settings",
          icon: <FreeeIcon />,
        },
      ],
    },
    // TODO: 将来的な実装のためアーカイブ (2025-02-01)
    // 実装時は以下のコメントを解除してください
    // {
    //   title: "分析・レポート",
    //   path: "/admin/analytics",
    // },
    {
      title: "設定",
      icon: <SettingsIcon />,
      children: [
        {
          title: "一般設定",
          path: "/admin/settings",
          icon: <GeneralSettingsIcon />,
        },
        {
          title: "経費承認者設定",
          path: "/admin/expense-approvers",
          icon: <ApproverSettingsIcon />,
        },
      ],
    },
  ];

  return (
    <BaseSidebar
      {...props}
      menuItems={menuItems}
      activeColor="error"
      avatarBgColor="error.main"
      footerText="© 2025 Monstera Admin"
    />
  );
};

export default AdminSidebar;