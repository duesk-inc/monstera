import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Grid,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { User } from '@/types/user';
import { formatDate } from '@/utils/dateUtils';

interface BasicInfoTabProps {
  engineer: User;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({ engineer }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        {/* 個人情報セクション */}
        <Grid size={12}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            個人情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <List dense>
            <ListItem>
              <BadgeIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="社員番号"
                secondary={engineer.employeeNumber}
              />
            </ListItem>
            <ListItem>
              <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="氏名"
                secondary={
                  <Box>
                    <Typography variant="body2">
                      {engineer.sei} {engineer.mei}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {engineer.seiKana || engineer.sei} {engineer.meiKana || engineer.mei}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
            <ListItem>
              <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="氏名（英語）"
                secondary={
                  <Box>
                    <Typography variant="body2">
                      {engineer.firstName} {engineer.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {engineer.firstNameKana} {engineer.lastNameKana}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          </List>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <List dense>
            <ListItem>
              <EmailIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="メールアドレス"
                secondary={engineer.email}
              />
            </ListItem>
            {engineer.phoneNumber && (
              <ListItem>
                <PhoneIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary="電話番号"
                  secondary={engineer.phoneNumber}
                />
              </ListItem>
            )}
            {engineer.education && (
              <ListItem>
                <SchoolIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary="学歴"
                  secondary={engineer.education}
                />
              </ListItem>
            )}
          </List>
        </Grid>

        {/* 組織情報セクション */}
        <Grid size={12} sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon />
            組織情報
          </Typography>
          <Divider sx={{ mb: 2 }} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <List dense>
            {engineer.department && (
              <ListItem>
                <BusinessIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary="部署"
                  secondary={engineer.department}
                />
              </ListItem>
            )}
            {engineer.position && (
              <ListItem>
                <BadgeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary="役職"
                  secondary={engineer.position}
                />
              </ListItem>
            )}
          </List>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <List dense>
            {engineer.hireDate && (
              <ListItem>
                <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText 
                  primary="入社日"
                  secondary={formatDate(engineer.hireDate)}
                />
              </ListItem>
            )}
            <ListItem>
              <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="登録日"
                secondary={formatDate(engineer.createdAt)}
              />
            </ListItem>
            <ListItem>
              <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
              <ListItemText 
                primary="最終更新日"
                secondary={formatDate(engineer.updatedAt)}
              />
            </ListItem>
          </List>
        </Grid>
      </Grid>
    </Box>
  );
};