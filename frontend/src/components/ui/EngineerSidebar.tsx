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
  Collapse,
  Badge,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assignment as WeeklyReportIcon,
  AccessTime as AttendanceIcon,
  Receipt as ExpenseIcon,
  BeachAccess as LeaveIcon,
  PictureAsPdf as SkillSheetIcon,
  History as WorkHistoryIcon,
  Assignment as ProposalIcon,
  NotificationsActive as NotificationsIcon,
  Person as ProfileIcon,
  ExpandLess,
  ExpandMore,
  Engineering as EngineerIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH } from "@/constants/layout";

interface EngineerSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path?: string;
  badge?: number;
  children?: MenuItem[];
}

const EngineerSidebar: React.FC<EngineerSidebarProps> = ({
  mobile = false,
  onClose,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      icon: <DashboardIcon />,
      path: "/dashboard",
    },
    {
      title: "週報",
      icon: <WeeklyReportIcon />,
      path: "/weekly-report",
    },
    {
      title: "勤怠管理",
      icon: <AttendanceIcon />,
      path: "/attendance",
    },
    {
      title: "経費申請",
      icon: <ExpenseIcon />,
      path: "/expenses",
    },
    {
      title: "休暇申請",
      icon: <LeaveIcon />,
      path: "/leave",
    },
    {
      title: "スキルシート",
      icon: <SkillSheetIcon />,
      path: "/skill-sheet",
    },
    {
      title: "職務経歴",
      icon: <WorkHistoryIcon />,
      path: "/work-history",
    },
    {
      title: "提案管理",
      icon: <ProposalIcon />,
      path: "/proposals",
    },
    {
      title: "通知設定",
      icon: <NotificationsIcon />,
      path: "/notifications/settings",
    },
    {
      title: "プロフィール",
      icon: <ProfileIcon />,
      path: "/profile",
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
            bgcolor: isActive ? "primary.50" : "transparent",
            color: isActive ? "primary.main" : "text.primary",
            "&:hover": {
              bgcolor: isActive ? "primary.100" : "action.hover",
            },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: 3,
              justifyContent: "center",
              color: isActive ? "primary.main" : "text.secondary",
            }}
          >
            {item.badge ? (
              <Badge badgeContent={item.badge} color="primary">
                {item.icon}
              </Badge>
            ) : (
              item.icon
            )}
          </ListItemIcon>
          <ListItemText
            primary={item.title}
            sx={{
              opacity: 1,
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
          <EngineerIcon sx={{ color: "primary.main", fontSize: 28 }} />
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
                color: "primary.main",
                fontWeight: 600,
              }}
            >
              エンジニアモード
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
          © 2025 Monstera
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

export default EngineerSidebar;