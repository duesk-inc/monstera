import React from 'react';
import { TableRow, TableCell } from '@mui/material';

export const EmptyRequestRow: React.FC = () => (
  <TableRow>
    <TableCell colSpan={5} align="center">
      申請データがありません
    </TableCell>
  </TableRow>
); 