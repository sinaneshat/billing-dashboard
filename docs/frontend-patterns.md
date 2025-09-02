# Frontend Architecture Patterns & Best Practices

This document outlines the comprehensive frontend patterns following TanStack Query best practices and Context7 recommendations.

## Architecture Overview

### Layer Structure
```
src/
├── services/api/          # API service layer (Hono RPC with type inference)
├── hooks/
│   ├── queries/          # React Query hooks for data fetching  
│   ├── mutations/        # React Query hooks for data mutations
│   └── utils/           # Query helper utilities and patterns
├── components/          # React components
├── lib/
│   ├── data/           # Query keys and prefetch utilities
│   └── utils/          # General utilities
```

## 1. Services Layer Pattern

### ✅ DO: Use Hono RPC with type inference
```typescript
// services/api/example.ts
import type { InferRequestType, InferResponseType } from 'hono/client';
import { parseResponse } from 'hono/client';
import { apiClient } from '@/api/client';

// Inferred types - no manual typing needed
export type GetItemsRequest = InferRequestType<(typeof apiClient)['items']['$get']>;
export type GetItemsResponse = InferResponseType<(typeof apiClient)['items']['$get']>;

export async function getItemsService(args?: GetItemsRequest) {
  return parseResponse(apiClient.items.$get(args));
}
```

### ❌ AVOID: Manual API types and fetch calls
```typescript
// Don't do this
export interface GetItemsResponse {
  items: Item[]; // Manual typing
}

export async function getItemsService(): Promise<GetItemsResponse> {
  const response = await fetch('/api/items'); // Manual fetch
  return response.json();
}
```

## 2. Query Patterns

### ✅ DO: Enhanced queries with smart retry logic
```typescript
// hooks/queries/items.ts
export function useItemsQuery(args?: GetItemsRequest) {
  return useQuery({
    queryKey: queryKeys.items.list(args),
    queryFn: () => getItemsService(args),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      // Don't retry client errors
      const errorStatus = (error as any)?.status;
      if (errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      // Retry server errors with exponential backoff
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(attemptIndex > 1 ? 2 ** attemptIndex * 1000 : 1000, 30 * 1000),
    throwOnError: false, // Handle errors in component state
  });
}
```

### ✅ DO: Comprehensive prefetching patterns
```typescript
// hooks/queries/items.ts
export function usePrefetchItemsOnInteraction() {
  const queryClient = useQueryClient();
  let prefetchPromise: Promise<void> | null = null;

  const prefetch = (args?: GetItemsRequest) => {
    if (!prefetchPromise) {
      prefetchPromise = queryClient.prefetchQuery({
        queryKey: queryKeys.items.list(args),
        queryFn: () => getItemsService(args),
        staleTime: 5 * 60 * 1000,
      });
    }
    return prefetchPromise;
  };

  return {
    prefetchOnHover: prefetch,
    prefetchOnFocus: prefetch,
    prefetchOnTouchStart: prefetch, // Mobile support
  };
}
```

## 3. Mutation Patterns

### ✅ DO: Mutations with optimistic updates and context
```typescript
// hooks/mutations/items.ts
export function useCreateItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: CreateItemRequest) => {
      return await createItemService(args);
    },
    onMutate: async (variables) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.items.all });

      // Snapshot previous value
      const previousItems = queryClient.getQueryData(queryKeys.items.list());

      // Optimistic update
      queryClient.setQueryData(queryKeys.items.list(), (old: any) => {
        if (old?.success && Array.isArray(old.data)) {
          return {
            ...old,
            data: [...old.data, { ...variables, id: 'temp-' + Date.now() }],
          };
        }
        return old;
      });

      return { previousItems, variables };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.items.list(), context.previousItems);
      }
    },
    onSuccess: (data) => {
      // Update cache with real data
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
    onSettled: () => {
      // Ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    },
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message.includes('Authentication')) {
        return false;
      }
      const errorStatus = (error as any)?.status;
      if (errorStatus >= 400 && errorStatus < 500) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

## 4. Component Patterns

### ✅ DO: Use helper hooks for UI state management
```typescript
// components/ItemsList.tsx
export function ItemsList() {
  const itemsQuery = useItemsQuery();
  const createItemMutation = useCreateItemMutation();
  
  // Use helper hooks for clean UI state management
  const queryUI = useQueryUIState(itemsQuery);
  const mutationUI = useMutationUIState(createItemMutation);
  const { prefetchOnHover } = usePrefetchItemsOnInteraction();

  const handleCreateItem = async (data: CreateItemRequest) => {
    try {
      await createItemMutation.mutateAsync(data);
      toast.success('Item created successfully');
    } catch (error) {
      // Error is handled by mutation hook, just show user feedback
      toast.error(mutationUI.error?.message || 'Failed to create item');
    }
  };

  // Loading states
  if (queryUI.showSkeleton) {
    return <ItemsListSkeleton />;
  }

  // Error states with retry option
  if (queryUI.showError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading items</AlertTitle>
        <AlertDescription>
          {queryUI.error?.message}
          {queryUI.canRetry && (
            <Button onClick={queryUI.retry} variant="outline" size="sm" className="ml-2">
              Retry
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Empty states
  if (queryUI.showEmpty) {
    return <EmptyItemsState />;
  }

  // Content with prefetching on interaction
  return (
    <div>
      <div onMouseEnter={prefetchOnHover}>
        {/* Navigation or buttons that benefit from prefetching */}
      </div>
      
      {/* Items list */}
      <div className="space-y-2">
        {itemsQuery.data?.data?.map(item => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Create form */}
      <CreateItemForm 
        onSubmit={handleCreateItem}
        isLoading={mutationUI.showPending}
        disabled={!mutationUI.canSubmit}
      />
      
      {/* Mutation feedback */}
      {mutationUI.showSuccess && (
        <Alert>
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Item created successfully!</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### ✅ DO: Handle multiple related queries
```typescript
// components/DashboardPage.tsx
export function DashboardPage() {
  const itemsQuery = useItemsQuery();
  const categoriesQuery = useCategoriesQuery();
  const userQuery = useCurrentUserQuery();

  // Manage multiple queries with helper
  const multiQueryUI = useMultipleQueries([itemsQuery, categoriesQuery, userQuery]);

  // Focus and network refetching
  useQueryFocusRefetch([itemsQuery, categoriesQuery], true);
  useQueryNetworkRefetch([itemsQuery, categoriesQuery], true);

  if (multiQueryUI.showSkeleton) {
    return <DashboardSkeleton />;
  }

  if (multiQueryUI.showError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error loading dashboard</AlertTitle>
        <AlertDescription>
          {multiQueryUI.errors.map(error => error.message).join(', ')}
          {multiQueryUI.canRetryAll && (
            <Button onClick={multiQueryUI.refetchAll} variant="outline" size="sm" className="ml-2">
              Retry All
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {multiQueryUI.showContent && (
        <>
          <ItemsList />
          <CategoriesList />
        </>
      )}
    </div>
  );
}
```

## 5. Prefetching Strategies

### ✅ DO: Strategic prefetching based on user journey
```typescript
// lib/data/prefetch-utils.ts
export const prefetchStrategies = {
  // Critical data for authenticated users
  essential: async (queryClient: QueryClient) => {
    const prefetchPromises = [
      queryClient.prefetchQuery({
        queryKey: queryKeys.auth.current,
        queryFn: getCurrentUserService,
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.items.current(),
        queryFn: () => getCurrentItemsService(),
        staleTime: 2 * 60 * 1000,
      }),
    ];

    await Promise.allSettled(prefetchPromises);
  },

  // Dashboard-specific prefetching
  dashboard: async (queryClient: QueryClient) => {
    await Promise.all([
      prefetchStrategies.essential(queryClient),
      prefetchDashboardData(queryClient),
    ]);
  },
} as const;
```

### ✅ DO: Use interaction-based prefetching
```typescript
// components/Navigation.tsx
export function Navigation() {
  const { prefetchOnHover } = useNavigationPrefetch('dashboard');

  return (
    <nav>
      <Link 
        href="/dashboard" 
        onMouseEnter={prefetchOnHover}
        onFocus={prefetchOnHover}
        onTouchStart={prefetchOnHover} // Mobile support
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

## 6. Error Handling Patterns

### ✅ DO: Centralized error handling with context
```typescript
// hooks/utils/query-helpers.ts
export function extractErrorInfo(error: unknown): QueryError {
  if (!error) return { message: 'Unknown error occurred' };

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    
    // Hono RPC error format
    if (typeof err.message === 'string') {
      return {
        message: err.message,
        status: typeof err.status === 'number' ? err.status : undefined,
        code: typeof err.code === 'string' ? err.code : undefined,
        details: err.details || err.data,
      };
    }
  }

  return { message: 'An unexpected error occurred' };
}
```

### ✅ DO: Smart error boundaries
```typescript
// components/QueryErrorBoundary.tsx
const errorBoundaryConfig = createQueryErrorBoundary();

export function AppWithErrorBoundary() {
  return (
    <QueryClient defaultOptions={{ queries: errorBoundaryConfig }}>
      <App />
    </QueryClient>
  );
}
```

## 7. Performance Optimization

### ✅ DO: Use appropriate stale times
```typescript
// Query timing guidelines
const STALE_TIMES = {
  REAL_TIME: 30 * 1000,      // 30 seconds - live data
  FREQUENT: 2 * 60 * 1000,   // 2 minutes - user data, subscriptions
  MODERATE: 5 * 60 * 1000,   // 5 minutes - payment methods, settings
  STABLE: 10 * 60 * 1000,    // 10 minutes - products, categories
  STATIC: 30 * 60 * 1000,    // 30 minutes - configurations
};
```

### ✅ DO: Implement proper cache management
```typescript
// lib/data/query-keys.ts
export const queryKeys = {
  items: {
    all: ['items'] as const,
    list: (filters?: Record<string, unknown>) => ['items', 'list', filters] as const,
    detail: (id: string) => ['items', 'detail', id] as const,
  },
} as const;

// Invalidation patterns
export const invalidationPatterns = {
  items: [
    queryKeys.items.all,
    queryKeys.items.list(),
  ],
  itemDetail: (id: string) => [
    queryKeys.items.detail(id),
    queryKeys.items.all,
    queryKeys.items.list(),
  ],
};
```

## 8. Testing Patterns

### ✅ DO: Test with MSW and React Query testing utils
```typescript
// tests/utils/test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithQuery(ui: React.ReactElement) {
  const testQueryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={testQueryClient}>
      {ui}
    </QueryClientProvider>
  );
}
```

## Summary of Benefits

Following these patterns provides:

1. **Type Safety**: Full end-to-end type safety with Hono RPC
2. **Performance**: Smart caching, prefetching, and retry strategies
3. **User Experience**: Optimistic updates, proper loading states, error handling
4. **Maintainability**: Consistent patterns, reusable hooks, clear separation
5. **Scalability**: Modular architecture that grows with the application

## Migration Checklist

- [ ] All API calls use service layer with type inference
- [ ] All queries have proper retry and error handling
- [ ] All mutations implement optimistic updates where appropriate
- [ ] Components use UI helper hooks for state management
- [ ] Prefetching is implemented for critical user journeys
- [ ] Error handling is consistent across the application
- [ ] Query keys follow the established patterns
- [ ] Cache invalidation is properly managed