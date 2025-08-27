"use client";

import React, { useState } from "react";
import {
  Box,
  ListItem,
  ListItemButton,
  Typography,
  Collapse,
  Avatar,
  List,
} from "@mui/material";
import {
  Email as EmailIcon,
  Logout as LogoutIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { User } from '@/types/auth';

interface UserMenuSectionProps {
  user: User | null;
  onLogout?: () => void;
  collapsed?: boolean;
  avatarBgColor?: string;
}

/**
 * サイドバー用ユーザーメニューセクション共通コンポーネント
 * エンジニア・管理者両画面で使用
 */
export const UserMenuSection: React.FC<UserMenuSectionProps> = ({
  user,
  onLogout,
  collapsed = false,
  avatarBgColor = "primary.main",
}) => {
  const [userMenuExpanded, setUserMenuExpanded] = useState(false);

  if (!user) return null;

  // ロールマッピング
  const getRoleLabel = (role: number): string => {
    const roleMap: Record<number, string> = {
      1: 'スーパー管理者',
      2: '管理者',
      3: 'マネージャー',
      4: 'エンジニア'
    };
    return roleMap[role] || 'ユーザー';
  };

  // ユーザーのイニシャルを取得
  const getUserInitial = (): string => {
    return user.first_name?.[0]?.toUpperCase() || 
           user.last_name?.[0]?.toUpperCase() || 
           'U';
  };

  // フルネームを取得
  const getFullName = (): string => {
    return user.last_name && user.first_name
      ? `${user.last_name} ${user.first_name}`
      : user.email;
  };

  return (
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
                bgcolor: avatarBgColor,
                fontSize: "0.875rem",
              }}
            >
              {getUserInitial()}
            </Avatar>
          ) : (
            <>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: avatarBgColor,
                    fontSize: "0.875rem",
                  }}
                >
                  {getUserInitial()}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="500">
                    {getFullName()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getRoleLabel(user.role)}
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
  );
};