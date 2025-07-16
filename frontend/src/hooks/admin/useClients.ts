import { useState, useEffect, useCallback } from 'react';
import { adminClientApi } from '@/lib/api/admin/client';
import { Client, ClientDetail, Project } from '@/types/admin/client';
import { useErrorHandler } from '@/hooks/common/useErrorHandler';
import { useToast } from '@/components/common/Toast';

// 取引先一覧用フック
export const useClients = (initialParams?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState(initialParams || { page: 1, limit: 20 });
  const { handleError } = useErrorHandler();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminClientApi.getClients(params);
      setClients(response.clients);
      setTotal(response.total);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [params, handleError]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    clients,
    total,
    loading,
    error,
    params,
    updateParams,
    refresh: fetchClients,
  };
};

// 取引先詳細用フック
export const useClientDetail = (id: string) => {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const fetchClient = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await adminClientApi.getClient(id);
      setClient(response.client);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [id, handleError]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const updateClient = async (data: any) => {
    try {
      const response = await adminClientApi.updateClient(id, data);
      setClient(response.client);
      showToast('取引先情報を更新しました', 'success');
      return response.client;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    }
  };

  return {
    client,
    loading,
    error,
    refresh: fetchClient,
    updateClient,
  };
};

// 取引先プロジェクト用フック
export const useClientProjects = (clientId: string, initialParams?: {
  page?: number;
  limit?: number;
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState(initialParams || { page: 1, limit: 10 });
  const { handleError } = useErrorHandler();

  const fetchProjects = useCallback(async () => {
    if (!clientId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await adminClientApi.getClientProjects(clientId, params);
      setProjects(response.projects);
      setTotal(response.total);
    } catch (err) {
      const error = err as Error;
      setError(error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [clientId, params, handleError]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const updateParams = (newParams: Partial<typeof params>) => {
    setParams({ ...params, ...newParams });
  };

  return {
    projects,
    total,
    loading,
    error,
    params,
    updateParams,
    refresh: fetchProjects,
  };
};

// 取引先作成・編集用フック
export const useClientForm = () => {
  const [submitting, setSubmitting] = useState(false);
  const { handleError } = useErrorHandler();
  const { showToast } = useToast();

  const createClient = async (data: any) => {
    try {
      setSubmitting(true);
      const response = await adminClientApi.createClient(data);
      showToast('取引先を登録しました', 'success');
      return response.client;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const updateClient = async (id: string, data: any) => {
    try {
      setSubmitting(true);
      const response = await adminClientApi.updateClient(id, data);
      showToast('取引先情報を更新しました', 'success');
      return response.client;
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      setSubmitting(true);
      await adminClientApi.deleteClient(id);
      showToast('取引先を削除しました', 'success');
    } catch (err) {
      const error = err as Error;
      handleError(error);
      throw error;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    createClient,
    updateClient,
    deleteClient,
    submitting,
  };
};