'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { cacheUtils } from '@/lib/query-client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * 開発環境用のキャッシュ監視コンポーネント
 */
export const CacheMonitor: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<ReturnType<typeof cacheUtils.getCacheSize>>(null);
  const queryClient = useQueryClient();

  // 本番環境では何も表示しない
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const updateCacheInfo = () => {
    setCacheInfo(cacheUtils.getCacheSize());
  };

  useEffect(() => {
    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 5000); // 5秒ごとに更新
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getQueryInfo = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return queries.map(query => ({
      queryKey: query.queryKey.join('.'),
      state: query.state.status,
      isStale: query.isStale(),
      dataUpdatedAt: query.state.dataUpdatedAt ? new Date(query.state.dataUpdatedAt).toLocaleTimeString() : 'Never',
      observerCount: query.getObserversCount(),
      gcTime: query.options.gcTime || 'Default',
      staleTime: query.options.staleTime || 'Default',
    }));
  };

  const clearCache = () => {
    cacheUtils.clearAll();
    updateCacheInfo();
  };

  const invalidateAll = () => {
    cacheUtils.invalidateAll();
    updateCacheInfo();
  };

  return (
    <Card 
      sx={{ 
        position: 'fixed', 
        bottom: 16, 
        right: 16, 
        zIndex: 9999,
        maxWidth: isExpanded ? 800 : 300,
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" component="div">
            React Query Cache
          </Typography>
          <IconButton onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {cacheInfo && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Total Queries: {cacheInfo.totalQueries}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active: {cacheInfo.activeQueries}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Stale: {cacheInfo.stalQueries}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Memory: {formatBytes(cacheInfo.memoryUsage)}
            </Typography>
          </Box>
        )}

        <Collapse in={isExpanded}>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={updateCacheInfo}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                onClick={invalidateAll}
              >
                Invalidate All
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={clearCache}
              >
                Clear Cache
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Query Key</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Stale</TableCell>
                    <TableCell>Updated</TableCell>
                    <TableCell>Observers</TableCell>
                    <TableCell>Stale Time</TableCell>
                    <TableCell>GC Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getQueryInfo().map((query, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {query.queryKey}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={query.state}
                          size="small"
                          color={
                            query.state === 'success' ? 'success' :
                            query.state === 'error' ? 'error' :
                            query.state === 'loading' ? 'info' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={query.isStale ? 'Stale' : 'Fresh'}
                          size="small"
                          color={query.isStale ? 'warning' : 'success'}
                        />
                      </TableCell>
                      <TableCell>{query.dataUpdatedAt}</TableCell>
                      <TableCell>{query.observerCount}</TableCell>
                      <TableCell>
                        {typeof query.staleTime === 'number' 
                          ? `${Math.round(query.staleTime / 1000)}s`
                          : query.staleTime}
                      </TableCell>
                      <TableCell>
                        {typeof query.gcTime === 'number' 
                          ? `${Math.round(query.gcTime / 1000)}s`
                          : query.gcTime}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};