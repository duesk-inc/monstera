"use client";

import React, { useState } from "react";
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
  Engineering as EngineerIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Business as BusinessIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH } from "@/constants/layout";
import { User } from '@/types/auth';

interface EngineerSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
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
  user,
  onLogout,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
  const [userMenuExpanded, setUserMenuExpanded] = useState(false);

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
              onClick={() => setUserMenuExpanded(!userMenuExpanded)}
              sx={{
                minHeight: 64,
                px: 2.5,
                justifyContent: "space-between",
                bgcolor: "background.paper",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "primary.main",
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
            </ListItemButton>
          </ListItem>
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
        </Box>
      )}

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