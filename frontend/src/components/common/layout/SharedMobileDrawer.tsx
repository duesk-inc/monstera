'use client';

import React from 'react';
import { Drawer, DrawerProps } from '@mui/material';

interface SharedMobileDrawerProps extends Omit<DrawerProps, 'variant'> {
  open: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}

export const SharedMobileDrawer: React.FC<SharedMobileDrawerProps> = ({
  open,
  onClose,
  width = 280,
  children,
  ...props
}) => {
  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': { 
          width, 
          boxSizing: 'border-box' 
        },
      }}
      {...props}
    >
      {children}
    </Drawer>
  );
};