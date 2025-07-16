"use client";

import React from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Collapse,
  Badge,
  Tooltip,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Engineering as EngineersIcon,
  Assignment as WeeklyReportIcon,
  AccessTime as AttendanceIcon,
  Receipt as ExpenseIcon,
  Group as FollowUpIcon,
  PictureAsPdf as SkillSheetIcon,
  Business as ClientIcon,
  TrendingUp as SalesIcon,
  Assessment as AnalyticsIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
  Receipt as ReceiptIcon,
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  BeachAccess as LeaveIcon,
  AccountBalance as AccountingIcon,
  MonetizationOn as BillingIcon,
  Sync as FreeeIcon,
  Category as ProjectGroupIcon,
  Assignment as ProposalIcon,
  History as WorkHistoryIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  open: boolean;
  onToggle?: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  children?: MenuItem[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  mobile = false,
  onClose,
  open,
  onToggle,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([
    "engineers",
  ]);

  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      icon: <DashboardIcon />,
      path: "/admin/dashboard",
    },
    {
      title: "エンジニア管理",
      icon: <EngineersIcon />,
      children: [
        {
          title: "週報管理",
          icon: <WeeklyReportIcon />,
          path: "/admin/engineers/weekly-reports",
          badge: 5,
        },
        {
          title: "勤怠承認",
          icon: <AttendanceIcon />,
          path: "/admin/engineers/attendance",
          badge: 3,
        },
        {
          title: "経費承認",
          icon: <ExpenseIcon />,
          path: "/admin/engineers/expenses",
          badge: 2,
        },
        {
          title: "承認催促管理",
          icon: <NotificationsActiveIcon />,
          path: "/admin/approval-reminder",
        },
        {
          title: "休暇申請管理",
          icon: <LeaveIcon />,
          path: "/admin/leave",
          badge: 0,
        },
        {
          title: "フォローアップ対象",
          icon: <FollowUpIcon />,
          path: "/admin/engineers/follow-up",
        },
        {
          title: "スキルシート",
          icon: <SkillSheetIcon />,
          path: "/admin/engineers/skill-sheets",
        },
        {
          title: "職務経歴管理",
          icon: <WorkHistoryIcon />,
          path: "/admin/engineers/work-history",
        },
      ],
    },
    {
      title: "ビジネス管理",
      icon: <BusinessIcon />,
      children: [
        {
          title: "取引先管理",
          icon: <ClientIcon />,
          path: "/admin/business/clients",
        },
        {
          title: "請求管理",
          icon: <ReceiptIcon />,
          path: "/admin/business/invoices",
        },
      ],
    },
    {
      title: "営業管理",
      icon: <SalesIcon />,
      children: [
        {
          title: "営業パイプライン",
          icon: <TimelineIcon />,
          path: "/admin/sales/pipeline",
        },
        {
          title: "提案管理",
          icon: <ProposalIcon />,
          path: "/sales/proposals",
        },
        {
          title: "エンジニア提案回答",
          icon: <ProposalIcon />,
          path: "/engineer-proposals",
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
          icon: <DashboardIcon />,
          path: "/admin/accounting",
        },
        {
          title: "請求書一覧",
          icon: <ReceiptIcon />,
          path: "/admin/accounting/invoices",
        },
        {
          title: "月次請求処理",
          icon: <BillingIcon />,
          path: "/admin/accounting/billing",
        },
        {
          title: "プロジェクトグループ",
          icon: <ProjectGroupIcon />,
          path: "/admin/accounting/project-groups",
        },
        {
          title: "freee連携",
          icon: <FreeeIcon />,
          path: "/admin/accounting/freee/settings",
        },
      ],
    },
    {
      title: "分析・レポート",
      icon: <AnalyticsIcon />,
      path: "/admin/analytics",
    },
    {
      title: "設定",
      icon: <SettingsIcon />,
      path: "/admin/settings",
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
            justifyContent: open ? "initial" : "center",
            px: 2.5,
            pl: level > 0 ? 4 : 2.5,
            borderRadius: 2,
            mx: 1,
            my: 0.5,
            bgcolor: isActive ? "error.50" : "transparent",
            color: isActive ? "error.main" : "text.primary",
            "&:hover": {
              bgcolor: isActive ? "error.100" : "action.hover",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: open ? 3 : "auto",
              justifyContent: "center",
              color: isActive ? "error.main" : "text.secondary",
            }}
          >
            {item.badge ? (
              <Badge badgeContent={item.badge} color="error">
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            sx={{
              opacity: open ? 1 : 0,
              "& .MuiTypography-root": {
                fontSize: level > 0 ? "0.875rem" : "0.95rem",
                fontWeight: isActive ? 600 : 400,
              },
            }}
          />
          {hasChildren &&
            open &&
            (isExpanded ? <ExpandLess /> : <ExpandMore />)}
        </ListItemButton>
      </ListItem>
    );

    if (!open) {
      return (
        <Tooltip title={item.title} placement="right" key={item.title}>
          {listItem}
        </Tooltip>
      );
    }

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
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: open ? "space-between" : "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 70,
        }}
      >
        {open && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AdminIcon sx={{ color: "error.main", fontSize: 28 }} />
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                MONSTERA
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "error.main",
                  fontWeight: 600,
                }}
              >
                管理者モード
              </Typography>
            </Box>
          </Box>
        )}
        {!mobile && (
          <IconButton
            onClick={onToggle}
            sx={{
              p: 0.5,
              color: "text.secondary",
              display: open ? "flex" : "none",
            }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
        {!open && !mobile && (
          <IconButton
            onClick={onToggle}
            sx={{
              p: 0.5,
              color: "text.secondary",
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>

      {/* メニューアイテム */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        <List>{menuItems.map((item) => renderMenuItem(item))}</List>
      </Box>

      {/* フッター */}
      {open && (
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
        width: open ? 280 : 68,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: open ? 280 : 68,
          boxSizing: "border-box",
          transition: "width 0.2s ease-in-out",
          overflowX: "hidden",
          borderRight: "1px solid",
          borderColor: "divider",
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};

export default AdminSidebar;
