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
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  AttachMoney as ExpenseIcon,
  EventAvailable as LeaveIcon,
  Description as SkillSheetIcon,
  AccountCircle as ProfileIcon,
} from "@mui/icons-material";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SIDEBAR_WIDTH, SIDEBAR_WIDTH_COLLAPSED } from "@/constants/layout";
import { User } from '@/types/auth';
import { UserMenuSection } from '@/components/common/sidebar/UserMenuSection';

interface EngineerSidebarProps {
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

const EngineerSidebar: React.FC<EngineerSidebarProps> = ({
  mobile = false,
  onClose,
  user,
  onLogout,
  collapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      path: "/dashboard",
      icon: <DashboardIcon />,
    },
    {
      title: "週報",
      path: "/weekly-report",
      icon: <AssignmentIcon />,
    },
    {
      title: "経費申請",
      path: "/expenses",
      icon: <ExpenseIcon />,
    },
    {
      title: "休暇申請",
      path: "/leave",
      icon: <LeaveIcon />,
    },
    {
      title: "スキルシート",
      path: "/skill-sheet",
      icon: <SkillSheetIcon />,
    },
    {
      title: "プロフィール",
      path: "/profile",
      icon: <ProfileIcon />,
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
            bgcolor: isActive ? "primary.50" : "transparent",
            color: isActive ? "primary.main" : "text.primary",
            "&:hover": {
              bgcolor: isActive ? "primary.100" : "action.hover",
            },
          }}
        >
          {item.icon && collapsed && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              width: '100%',
              color: isActive ? 'primary.main' : 'text.secondary'
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
              color: isActive ? 'primary.main' : 'text.secondary'
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
      <UserMenuSection 
        user={user}
        onLogout={onLogout}
        collapsed={collapsed}
        avatarBgColor="primary.main"
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
            © 2025 Monstera
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

export default EngineerSidebar;