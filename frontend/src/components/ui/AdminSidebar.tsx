"use client";

import React from "react";
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
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  AdminPanelSettings as AdminIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH } from "@/constants/layout";

interface AdminSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  title: string;
  path?: string;
  badge?: number;
  children?: MenuItem[];
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({
  mobile = false,
  onClose,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([
    "engineers",
  ]);

  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      path: "/admin/dashboard",
    },
    {
      title: "エンジニア管理",
      children: [
        {
          title: "週報管理",
          path: "/admin/engineers/weekly-reports",
          badge: 5,
        },
        {
          title: "勤怠承認",
          path: "/admin/engineers/attendance",
          badge: 3,
        },
        {
          title: "経費承認",
          path: "/admin/engineers/expenses",
          badge: 2,
        },
        {
          title: "承認催促管理",
          path: "/admin/approval-reminder",
        },
        {
          title: "休暇申請管理",
          path: "/admin/leave",
          badge: 0,
        },
        {
          title: "フォローアップ対象",
          path: "/admin/engineers/follow-up",
        },
        {
          title: "スキルシート",
          path: "/admin/engineers/skill-sheets",
        },
        {
          title: "職務経歴管理",
          path: "/admin/engineers/work-history",
        },
      ],
    },
    {
      title: "ビジネス管理",
      children: [
        {
          title: "取引先管理",
          path: "/admin/business/clients",
        },
        {
          title: "請求管理",
          path: "/admin/business/invoices",
        },
      ],
    },
    {
      title: "営業管理",
      children: [
        {
          title: "営業パイプライン",
          path: "/admin/sales/pipeline",
        },
        {
          title: "提案管理",
          path: "/sales/proposals",
        },
        {
          title: "エンジニア提案回答",
          path: "/engineer-proposals",
          badge: 0,
        },
      ],
    },
    {
      title: "経理管理",
      children: [
        {
          title: "ダッシュボード",
          path: "/admin/accounting",
        },
        {
          title: "請求書一覧",
          path: "/admin/accounting/invoices",
        },
        {
          title: "月次請求処理",
          path: "/admin/accounting/billing",
        },
        {
          title: "プロジェクトグループ",
          path: "/admin/accounting/project-groups",
        },
        {
          title: "freee連携",
          path: "/admin/accounting/freee/settings",
        },
      ],
    },
    {
      title: "分析・レポート",
      path: "/admin/analytics",
    },
    {
      title: "設定",
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
            justifyContent: "initial",
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
          {hasChildren &&
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
      }}
    >
      {/* ヘッダー */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: 70,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: "bold",
                color: "text.primary",
                lineHeight: 1.2,
								marginLeft: 3,
              }}
            >
              MONSTERA
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* メニューアイテム */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        <List>{menuItems.map((item) => renderMenuItem(item))}</List>
      </Box>

      {/* フッター */}
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
    </Box>
  );

  if (mobile) {
    return drawerContent;
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: SIDEBAR_WIDTH,
          boxSizing: "border-box",
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
