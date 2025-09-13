import type { QueryKey } from '@tanstack/react-query';
import { stableKey } from '@/utils/hash';

export const feedsKeys = {
  all: ['feeds'] as const,
  list: (urls: string[]): QueryKey => ['feeds', 'list', stableKey(urls)] as const,
  details: (id: string) => ['feeds', 'detail', id] as const,
} as const;