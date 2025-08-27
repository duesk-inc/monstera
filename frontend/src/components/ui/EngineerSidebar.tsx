"use client";

import React from "react";
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  AttachMoney as ExpenseIcon,
  EventAvailable as LeaveIcon,
  Description as SkillSheetIcon,
  AccountCircle as ProfileIcon,
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