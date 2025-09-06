'use client';

import React from 'react';
import { Avatar, AvatarProps, CircularProgress } from '@mui/material';
import { User } from '@/types/auth';
import { COMPONENT_SIZES } from '@/constants/dimensions';
import { FONT_SIZE_SPECIAL } from '@/constants/typography';

interface UserAvatarProps extends Omit<AvatarProps, 'children'> {
  user: User | null;
  size?: 'small' | 'medium' | 'large';
  isLoading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  size = 'medium',
  isLoading = false,
  sx,
  ...props 
}) => {
  const sizes = {
    small: { width: COMPONENT_SIZES.AVATAR.SM, height: COMPONENT_SIZES.AVATAR.SM, fontSize: FONT_SIZE_SPECIAL.CAPTION },
    medium: { width: COMPONENT_SIZES.AVATAR.MD, height: COMPONENT_SIZES.AVATAR.MD, fontSize: FONT_SIZE_SPECIAL.BODY_SMALL },
    large: { width: COMPONENT_SIZES.AVATAR.LG, height: COMPONENT_SIZES.AVATAR.LG, fontSize: FONT_SIZE_SPECIAL.BODY_LARGE }
  };

  const getInitials = () => {
    if (isLoading) return '';  // ローディング中は空文字
    if (!user) return '?';
    
    // Check for first_name and last_name (snake_case format)
    const firstNameStr = (user.first_name ?? '') as string;
    const lastNameStr = (user.last_name ?? '') as string;
    const hasFirstName = firstNameStr.length > 0;
    const hasLastName = lastNameStr.length > 0;
    
    if (hasFirstName && hasLastName) {
      return `${firstNameStr.charAt(0)}${lastNameStr.charAt(0)}`.toUpperCase();
    }
    
    if (hasFirstName) {
      return firstNameStr.charAt(0).toUpperCase();
    }
    if (hasLastName) {
      return lastNameStr.charAt(0).toUpperCase();
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
      {isLoading ? (
        <CircularProgress 
          size={parseInt(sizes[size].width as string, 10) * 0.5} 
          sx={{ color: 'white' }}
        />
      ) : (
        getInitials()
      )}
    </Avatar>
  );
};
