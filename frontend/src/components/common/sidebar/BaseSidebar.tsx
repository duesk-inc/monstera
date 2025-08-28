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
  Popover,
  Paper,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ChevronRight,
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
  children?: MenuItem[];
  badge?: number;
}

export interface BaseSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user: User | null;
  onLogout: () => void;
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
  const [hoveredItem, setHoveredItem] = React.useState<string | null>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  // デバッグ: userオブジェクトとmobileプロパティの確認
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('BaseSidebar Debug:', {
        mobile,
        collapsed,
        user,
        avatarBgColor,
        activeColor,
        hasUser: !!user,
        userRole: user?.role,
      });
    }
  }, [mobile, collapsed, user, avatarBgColor, activeColor]);

  const handleToggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>, itemTitle: string) => {
    if (!mobile && !collapsed) {
      setHoveredItem(itemTitle);
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setAnchorEl(null);
  };

  const renderMenuItem = (item: MenuItem, level: number = 0): React.ReactNode => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.title);
    const isActive = item.path ? pathname === item.path : false;
    const activeBgColor = activeColor === 'primary' ? 'primary.50' : 'error.50';
    const activeTextColor = activeColor === 'primary' ? 'primary.main' : 'error.main';
    const activeHoverColor = activeColor === 'primary' ? 'primary.100' : 'error.100';
    const isHovered = hoveredItem === item.title;

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
          onMouseEnter={hasChildren ? (e) => handleMouseEnter(e, item.title) : undefined}
          onMouseLeave={hasChildren ? handleMouseLeave : undefined}
          onClick={
            hasChildren && mobile
              ? () => handleToggleExpand(item.title)
              : hasChildren && !mobile
                ? (e: React.MouseEvent) => e.preventDefault()  // デスクトップで子メニューがある場合はクリックを無効化
                : !hasChildren && mobile
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
          {hasChildren && !collapsed && (
            <ChevronRight sx={{ ml: 'auto', fontSize: 18, color: 'text.secondary' }} />
          )}
        </ListItemButton>
      </ListItem>
    );

    return (
      <React.Fragment key={item.title}>
        {listItem}
        {/* デスクトップ用ホバーポップアップメニュー */}
        {hasChildren && isHovered && !mobile && !collapsed && (
          <Popover
            open={Boolean(anchorEl) && hoveredItem === item.title}
            anchorEl={anchorEl}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            onClose={handleMouseLeave}
            disableRestoreFocus
            sx={{
              pointerEvents: 'none',
              '& .MuiPopover-paper': {
                pointerEvents: 'auto',
                ml: 0.5,
                minWidth: 200,
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                mt: -1,
              },
            }}
          >
            <Paper
              onMouseEnter={() => {
                setHoveredItem(item.title);
              }}
              onMouseLeave={handleMouseLeave}
              sx={{ py: 0.5 }}
            >
              <List component="div" disablePadding>
                {item.children!.map((child) => (
                  <ListItem key={child.title} disablePadding>
                    <ListItemButton
                      component={child.path ? Link : "div"}
                      {...(child.path ? { href: child.path } : {})}
                      sx={{
                        px: 2.5,
                        py: 1,
                        minHeight: 40,
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        color: pathname === child.path ? activeTextColor : 'text.primary',
                        bgcolor: pathname === child.path ? activeBgColor : 'transparent',
                        fontWeight: pathname === child.path ? 600 : 400,
                      }}
                    >
                      <ListItemText
                        primary={child.title}
                        primaryTypographyProps={{
                          fontSize: '0.875rem',
                        }}
                      />
                      {child.badge && (
                        <Badge badgeContent={child.badge} color={activeColor} sx={{ ml: 2 }} />
                      )}
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Popover>
        )}
        {/* モバイル用アコーディオンメニュー */}
        {hasChildren && mobile && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      {/* 開閉ボタン - サイドバーの外に配置 */}
      {onToggleCollapse && !mobile && (
        <IconButton
          onClick={onToggleCollapse}
          sx={{
            position: 'absolute',
            top: 60,
            right: collapsed ? -24 : -24,
            bgcolor: 'background.paper',
            border: 'none',
            borderRadius: '0 8px 8px 0',
            width: 24,
            height: 40,
            padding: 0,
            boxShadow: '2px 0 4px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              bgcolor: 'grey.100',
              '& svg': {
                transform: 'scale(1.1)',
              },
            },
            transition: 'all 0.2s',
            zIndex: 1300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {collapsed ? (
            <ChevronRightIcon sx={{ fontSize: 16, transition: 'transform 0.2s', color: 'text.secondary' }} />
          ) : (
            <ChevronLeftIcon sx={{ fontSize: 16, transition: 'transform 0.2s', color: 'text.secondary' }} />
          )}
        </IconButton>
      )}
      
      {/* ヘッダー部分 */}
      <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Image
            src="/assets/monstera-logo.png"
            alt="Monstera Logo"
            width={36}
            height={36}
            style={{
              objectFit: 'contain',
            }}
          />
          {!collapsed && (
            <Typography variant="h6" fontWeight={700}>
              MONSTERA
            </Typography>
          )}
        </Box>
      </Box>

      {/* メニューアイテム */}
      <List sx={{ flexGrow: 1, py: 0, overflow: 'auto' }}>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>

      {/* UserMenuSection - 下部に移動 */}
      <UserMenuSection
        user={user}
        avatarBgColor={avatarBgColor}
        collapsed={collapsed}
        onLogout={onLogout}
      />

      {/* フッター */}
      {!collapsed && (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {footerText}
          </Typography>
        </Box>
      )}
    </Box>
  );

  if (mobile) {
    return (
      <Drawer
        anchor="left"
        open={true}
        onClose={onClose}
        sx={{
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    );
  }

  return (
    <Box
      sx={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        flexShrink: 0,
        transition: "width 0.3s ease",
        "& .MuiDrawer-paper": {
          width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
          boxSizing: "border-box",
          transition: "width 0.3s ease",
          overflow: "hidden",
          position: "relative",
        },
      }}
    >
      <Drawer
        variant="permanent"
        sx={{
          "& .MuiDrawer-paper": {
            width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
            boxSizing: "border-box",
            transition: "width 0.3s ease",
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            overflow: 'visible',  // ボタンをはみ出させるため
          },
        }}
      >
        {sidebarContent}
      </Drawer>
    </Box>
  );
};