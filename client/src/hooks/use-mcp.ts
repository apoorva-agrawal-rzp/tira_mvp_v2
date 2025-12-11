import { useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function useMCP() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async <T = unknown>(
    toolName: string,
    params: Record<string, unknown> = {}
  ): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('POST', '/api/mcp/invoke', {
        tool: toolName,
        params,
      });
      
      const result: MCPResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'MCP invocation failed');
      }
      
      return result.data as T;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { invoke, loading, error, clearError };
}
