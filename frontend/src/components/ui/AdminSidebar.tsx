"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Collapse,
  Badge,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
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
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "@/constants/layout";
import { User } from '@/types/auth';

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: number;
  children?: MenuItem[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  mobile = false,
  onClose,
  user,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([
    "engineers",
  ]);
  const [userMenuExpanded, setUserMenuExpanded] = useState(false);

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

  const handleToggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.path === pathname;

    const listItem = (
      <ListItem
        disablePadding
        sx={{
          display: "block",
          px: level > 0 ? 0 : 1,
        }}
      >
        <ListItemButton
          component={item.path && !hasChildren ? Link : "div"}
          {...(item.path && !hasChildren ? { href: item.path } : {})}
          onClick={
            hasChildren
              ? () => handleToggleExpand(item.title)
              : mobile
                ? onClose
                : undefined
          }
          sx={{
            minHeight: 48,
            justifyContent: "initial",
            px: 2.5,
            pl: level > 0 ? 4 : 2.5,
            borderRadius: 0,
            mx: 1,
            my: 0.5,
            bgcolor: isActive ? "error.50" : "transparent",
            color: isActive ? "error.main" : "text.primary",
            "&:hover": {
              bgcolor: isActive ? "error.100" : "action.hover",
            },
          }}
        >
          {item.icon && collapsed && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%',
              color: isActive ? 'error.main' : 'text.secondary'
            }}>
              {React.cloneElement(item.icon as React.ReactElement, {
                sx: { fontSize: 24 }
              })}
            </Box>
          )}
          {item.icon && !collapsed && (
            <Box sx={{ 
              mr: 2, 
              display: 'flex', 
              alignItems: 'center',
              color: isActive ? 'error.main' : 'text.secondary'
            }}>
              {React.cloneElement(item.icon as React.ReactElement, {
                sx: { fontSize: 20 }
              })}
            </Box>
          )}
          {!collapsed && (
          <ListItemText
            primary={
              item.badge ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {item.title}
                  <Badge badgeContent={item.badge} color="error" />
                </Box>
              ) : (
                item.title
              )
            }
            sx={{
              opacity: 1,
              pl: 0,
              "& .MuiTypography-root": {
                fontSize: level > 0 ? "0.875rem" : "0.95rem",
                fontWeight: isActive ? 600 : 400,
              },
            }}
          />
          )}
          {hasChildren && !collapsed &&
            (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
      </ListItem>
    );

    return (
      <React.Fragment key={item.title}>
        {listItem}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        position: 'relative',
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 70,
          position: 'relative',
        }}
      >
        {!collapsed ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ml: 1 }}>
            <Image
              src="/assets/monstera-logo.png"
              alt="Monstera Logo"
              width={32}
              height={32}
              style={{ objectFit: 'contain' }}
            />
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "text.primary",
                lineHeight: 1.2,
              }}
            >
              MONSTERA
            </Typography>
          </Box>
        ) : (
          <Image
            src="/assets/monstera-logo.png"
            alt="Monstera Logo"
            width={32}
            height={32}
            style={{ objectFit: 'contain' }}
          />
        )}
        
        {/* 開閉ボタン（ヘッダー部分の横に配置） */}
        {!mobile && (
          <Box
            sx={{
              position: 'absolute',
              right: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 1,
            }}
          >
            <IconButton
              onClick={onToggleCollapse}
              sx={{
                width: 20,
                height: 48,
                borderRadius: '0 4px 4px 0',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderLeft: 'none',
                p: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                '&:hover': {
                  bgcolor: 'background.paper', // 背景色は変化させない
                },
                '& svg': {
                  transition: 'transform 0.2s ease', // スムーズなアニメーション
                },
                '&:hover svg': {
                  transform: 'scale(1.2)', // ホバー時にアイコンを1.2倍に拡大
                },
              }}
            >
              {collapsed ? (
                <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              ) : (
                <ChevronLeftIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              )}
            </IconButton>
          </Box>
        )}
      </Box>

      {/* メニューアイテム */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        <List>{menuItems.map((item) => renderMenuItem(item))}</List>
      </Box>

      {/* ユーザーメニュー */}
      {user && (
        <Box
          sx={{
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <ListItem disablePadding>
            <ListItemButton
              onClick={collapsed ? undefined : () => setUserMenuExpanded(!userMenuExpanded)}
              sx={{
                minHeight: 64,
                px: collapsed ? 1 : 2.5,
                justifyContent: collapsed ? "center" : "space-between",
                bgcolor: "background.paper",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              {collapsed ? (
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "error.main",
                    fontSize: "0.875rem",
                  }}
                >
                  {user.first_name?.[0]?.toUpperCase() || user.last_name?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              ) : (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: "error.main",
                        fontSize: "0.875rem",
                      }}
                    >
                      {user.first_name?.[0]?.toUpperCase() || user.last_name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight="500">
                        {user.last_name && user.first_name
                          ? `${user.last_name} ${user.first_name}`
                          : user.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(() => {
                          const roleMap: Record<number, string> = {
                            1: 'スーパー管理者',
                            2: '管理者',
                            3: 'マネージャー',
                            4: 'エンジニア'
                          };
                          return roleMap[user.role] || 'ユーザー';
                        })()}
                      </Typography>
                    </Box>
                  </Box>
                  {userMenuExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </>
              )}
            </ListItemButton>
          </ListItem>
          {!collapsed && (
          <Collapse in={userMenuExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  sx={{
                    pl: 4,
                    py: 1,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                  disabled
                >
                  <EmailIcon fontSize="small" sx={{ mr: 2, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                    {user.email}
                  </Typography>
                </ListItemButton>
              </ListItem>
              {onLogout && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={onLogout}
                    sx={{
                      pl: 4,
                      py: 1,
                      color: "error.main",
                      "&:hover": {
                        bgcolor: "error.50",
                      },
                    }}
                  >
                    <LogoutIcon fontSize="small" sx={{ mr: 2 }} />
                    <Typography variant="body2" fontWeight={500}>
                      ログアウト
                    </Typography>
                  </ListItemButton>
                </ListItem>
              )}
            </List>
          </Collapse>
          )}
        </Box>
      )}

      {/* フッター */}
      {!collapsed && (
        <Box
          sx={{
            p: 2,
            borderTop: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © 2025 Monstera Admin
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (mobile) {
    return drawerContent;
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        flexShrink: 0,
        transition: 'width 0.3s ease',
        "& .MuiDrawer-paper": {
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          boxSizing: "border-box",
          overflow: "visible",
          borderRight: "1px solid",
          borderColor: "divider",
          transition: 'width 0.3s ease',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default AdminSidebar;
