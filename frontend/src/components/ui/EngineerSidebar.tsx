"use client";

import React from "react";
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  AttachMoney as ExpenseIcon,
  EventAvailable as LeaveIcon,
  Description as SkillSheetIcon,
  AccountCircle as ProfileIcon,
  Work as WorkIcon,
} from "@mui/icons-material";
import { User } from '@/types/auth';
import { BaseSidebar, MenuItem } from '@/components/common/sidebar/BaseSidebar';

interface EngineerSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
  user?: User | null;
  onLogout?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const EngineerSidebar: React.FC<EngineerSidebarProps> = (props) => {
  // デバッグ: propsの確認
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('EngineerSidebar Props:', {
        hasUser: !!props.user,
        userEmail: props.user?.email,
        userRole: props.user?.role,
        collapsed: props.collapsed,
        mobile: props.mobile,
        fullUserObject: props.user
      });
    }
  }, [props]);
  const menuItems: MenuItem[] = [
    {
      title: "ダッシュボード",
      path: "/dashboard",
      icon: <DashboardIcon />,
    },
    {
      title: "案件情報",
      path: "/project",
      icon: <WorkIcon />,
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

  return (
    <BaseSidebar
      {...props}
      menuItems={menuItems}
      activeColor="primary"
      avatarBgColor="primary.main"
      footerText="© 2025 Monstera"
    />
  );
};

export default EngineerSidebar;
