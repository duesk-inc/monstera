'use client';

import React from 'react';
import { Avatar, AvatarProps } from '@mui/material';
import { User } from '@/types/auth';
import { COMPONENT_SIZES } from '@/constants/dimensions';
import { FONT_SIZE_SPECIAL } from '@/constants/typography';

interface UserAvatarProps extends Omit<AvatarProps, 'children'> {
  user: User | null;
  size?: 'small' | 'medium' | 'large';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'medium',
  sx,
  ...props 
}) => {
  const sizes = {
    small: { width: COMPONENT_SIZES.AVATAR.SM, height: COMPONENT_SIZES.AVATAR.SM, fontSize: FONT_SIZE_SPECIAL.CAPTION },
    medium: { width: COMPONENT_SIZES.AVATAR.MD, height: COMPONENT_SIZES.AVATAR.MD, fontSize: FONT_SIZE_SPECIAL.BODY_SMALL },
    large: { width: COMPONENT_SIZES.AVATAR.LG, height: COMPONENT_SIZES.AVATAR.LG, fontSize: FONT_SIZE_SPECIAL.BODY_LARGE }
  };

  const getInitials = () => {
    if (!user) return '?';
    
    // Check for first_name and last_name (snake_case format)
    const hasFirstName = user.first_name && typeof user.first_name === 'string' && user.first_name.length > 0;
    const hasLastName = user.last_name && typeof user.last_name === 'string' && user.last_name.length > 0;
    
    if (hasFirstName && hasLastName) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    
    if (hasFirstName) {
      return user.first_name.charAt(0).toUpperCase();
    }
    if (hasLastName) {
      return user.last_name.charAt(0).toUpperCase();
    }
    
    // Fallback to email
    if (user.email && user.email.length > 0) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  return (
    <Avatar
      sx={{
        ...sizes[size],
        cursor: 'pointer',
        fontWeight: 'bold',
        ...sx
      }}
      {...props}
    >
      {getInitials()}
    </Avatar>
  );
};