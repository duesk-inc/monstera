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
      path: "/dashboard",
    },
    {
      title: "週報",
      path: "/weekly-report",
    },
    {
      title: "勤怠管理",
      path: "/attendance",
    },
    {
      title: "経費申請",
      path: "/expenses",
    },
    {
      title: "休暇申請",
      path: "/leave",
    },
    {
      title: "スキルシート",
      path: "/skill-sheet",
    },
    {
      title: "職務経歴",
      path: "/work-history",
    },
    {
      title: "提案管理",
      path: "/proposals",
    },
    {
      title: "通知設定",
      path: "/notifications/settings",
    },
    {
      title: "プロフィール",
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
          <ListItemText
            primary={
              item.badge ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {item.title}
                  <Badge badgeContent={item.badge} color="primary" />
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