import {
  Notifications as NotificationsIcon,
  EventNote as EventNoteIcon,
  Receipt as ReceiptIcon,
  Assignment as AssignmentIcon,
  Person as ProfileIcon,
} from '@mui/icons-material';
import { NotificationType } from '@/types/notification';

/**
 * 通知タイプに対応するアイコンを取得する統一関数
 * @param type 通知タイプ
 * @returns 対応するMUIアイコンコンポーネント
 */
export const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'leave':
      return <EventNoteIcon fontSize="small" />;
    case 'expense':
      return <ReceiptIcon fontSize="small" />;
    case 'weekly':
      return <AssignmentIcon fontSize="small" />;
    case 'project':
      return <ProfileIcon fontSize="small" />;
    case 'system':
    default:
      return <NotificationsIcon fontSize="small" />;
  }
};

/**
 * 通知タイプに対応する色を取得する統一関数
 * @param type 通知タイプ
 * @returns テーマカラー文字列
 */
export const getNotificationTypeColor = (type: NotificationType): string => {
  switch (type) {
    case 'leave':
      return 'primary.main';
    case 'expense':
      return 'warning.main';
    case 'weekly':
      return 'info.main';
    case 'project':
      return 'success.main';
    case 'system':
    default:
      return 'secondary.main';
  }
};

/**
 * 通知タイプの日本語名を取得する統一関数
 * @param type 通知タイプ
 * @returns 日本語のタイプ名
 */
export const getNotificationTypeName = (type: NotificationType): string => {
  switch (type) {
    case 'leave':
      return '休暇';
    case 'expense':
      return '経費';
    case 'weekly':
      return '週報';
    case 'project':
      return 'プロジェクト';
    case 'system':
      return 'システム';
    default:
      return '不明';
  }
}; 