'use client';

import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

export default function GridTest() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={2}>
        <Grid size={12}>
          <Paper>
            <Typography>size=12</Typography>
          </Paper>
        </Grid>
        <Grid size={6}>
          <Paper>
            <Typography>size=6</Typography>
          </Paper>
        </Grid>
        <Grid size={6}>
          <Paper>
            <Typography>size=6</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
} 