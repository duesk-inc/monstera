"use client";

import React from "react";
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
  IconButton,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "@/constants/layout";
import { User } from '@/types/auth';
import { UserMenuSection } from './UserMenuSection';

export interface MenuItem {
  title: string;
  path?: string;
  icon?: React.ReactNode;
  badge?: number;
  children?: MenuItem[];
}

export interface BaseSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  menuItems: MenuItem[];
  activeColor?: 'primary' | 'error';
  avatarBgColor?: string;
  footerText?: string;
  initialExpandedItems?: string[];
}

/**
 * サイドバーの基底コンポーネント
 * エンジニア・管理者両画面で使用
 */
export const BaseSidebar: React.FC<BaseSidebarProps> = ({
  mobile = false,
  onClose,
  user,
  onLogout,
  collapsed = false,
  onToggleCollapse,
  menuItems,
  activeColor = 'primary',
  avatarBgColor = 'primary.main',
  footerText = '© 2025 Monstera',
  initialExpandedItems = [],
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>(initialExpandedItems);

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

    const activeBgColor = activeColor === 'primary' ? 'primary.50' : 'error.50';
    const activeTextColor = activeColor === 'primary' ? 'primary.main' : 'error.main';
    const activeHoverColor = activeColor === 'primary' ? 'primary.100' : 'error.100';

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
            bgcolor: isActive ? activeBgColor : "transparent",
            color: isActive ? activeTextColor : "text.primary",
            "&:hover": {
              bgcolor: isActive ? activeHoverColor : "action.hover",
            },
          }}
        >
          {item.icon && collapsed && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%',
              color: isActive ? activeTextColor : 'text.secondary'
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
              color: isActive ? activeTextColor : 'text.secondary'
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
                  <Badge badgeContent={item.badge} color={activeColor} />
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
                  bgcolor: 'background.paper',
                },
                '& svg': {
                  transition: 'transform 0.2s ease',
                },
                '&:hover svg': {
                  transform: 'scale(1.2)',
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
      <UserMenuSection 
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        avatarBgColor={avatarBgColor}
      />

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
            {footerText}
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