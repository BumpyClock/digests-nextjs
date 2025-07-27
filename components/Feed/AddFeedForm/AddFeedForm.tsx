// ABOUTME: Form component for adding new RSS/podcast feeds with React Query mutations
// ABOUTME: Provides validation, loading states, and error handling for feed addition

'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Plus, Link, AlertCircle } from 'lucide-react'
import { useAddFeed, useBatchAddFeeds } from '@/hooks/queries/use-feed-mutations'
import { isValidUrl, isValidFeedUrl } from '@/utils/security'
import { FEATURES } from '@/lib/feature-flags'

// Form validation schema
const addFeedSchema = z.object({
  url: z
    .string()
    .min(1, 'Feed URL is required')
    .refine((url) => isValidUrl(url), {
      message: 'Please enter a valid URL',
    })
    .refine((url) => isValidFeedUrl(url), {
      message: 'URL must be a valid RSS or Atom feed',
    }),
})

const batchAddSchema = z.object({
  urls: z
    .string()
    .min(1, 'At least one URL is required')
    .transform((value) => 
      value
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0)
    )
    .refine((urls) => urls.length > 0, {
      message: 'Please provide at least one valid URL',
    })
    .refine((urls) => urls.every(url => isValidUrl(url)), {
      message: 'All URLs must be valid',
    })
    .refine((urls) => urls.every(url => isValidFeedUrl(url)), {
      message: 'All URLs must be valid RSS or Atom feeds',
    }),
})

type AddFeedFormData = z.infer<typeof addFeedSchema>
type BatchAddFormData = z.infer<typeof batchAddSchema>

interface AddFeedFormProps {
  onSuccess?: () => void
  className?: string
}

export function AddFeedForm({ onSuccess, className }: AddFeedFormProps) {
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const addFeedMutation = useAddFeed()
  const batchAddMutation = useBatchAddFeeds()
  
  // Single feed form
  const singleForm = useForm<AddFeedFormData>({
    resolver: zodResolver(addFeedSchema),
    defaultValues: {
      url: '',
    },
  })

  // Batch add form
  const batchForm = useForm<BatchAddFormData>({
    resolver: zodResolver(batchAddSchema),
    defaultValues: {
      urls: '',
    },
  })

  const isFeatureEnabled = FEATURES.USE_REACT_QUERY_FEEDS

  const handleSingleSubmit = useCallback(async (data: AddFeedFormData) => {
    if (!isFeatureEnabled) {
      console.warn('React Query feeds feature is not enabled')
      return
    }

    try {
      await addFeedMutation.mutateAsync({ url: data.url })
      singleForm.reset()
      onSuccess?.()
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Failed to add feed:', error)
    }
  }, [addFeedMutation, singleForm, onSuccess, isFeatureEnabled])

  const handleBatchSubmit = useCallback(async (data: BatchAddFormData) => {
    if (!isFeatureEnabled) {
      console.warn('React Query feeds feature is not enabled')
      return
    }

    try {
      await batchAddMutation.mutateAsync(data.urls)
      batchForm.reset()
      onSuccess?.()
    } catch (error) {
      // Error handling is done by the mutation
      console.error('Failed to batch add feeds:', error)
    }
  }, [batchAddMutation, batchForm, onSuccess, isFeatureEnabled])

  const isLoading = addFeedMutation.isPending || batchAddMutation.isPending

  if (!isFeatureEnabled) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              React Query feeds feature is not enabled. Please enable it in the feature flags.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Feed
        </CardTitle>
        <CardDescription>
          Add RSS or Atom feeds to your collection. You can add single feeds or import multiple at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={mode === 'single' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('single')}
            disabled={isLoading}
          >
            Single Feed
          </Button>
          <Button
            type="button"
            variant={mode === 'batch' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setMode('batch')}
            disabled={isLoading}
          >
            Batch Import
          </Button>
        </div>

        {mode === 'single' ? (
          /* Single Feed Form */
          <form onSubmit={singleForm.handleSubmit(handleSingleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Feed URL
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com/feed.xml"
                disabled={isLoading}
                {...singleForm.register('url')}
              />
              {singleForm.formState.errors.url && (
                <p className="text-sm text-destructive">
                  {singleForm.formState.errors.url.message}
                </p>
              )}
            </div>

            {addFeedMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {addFeedMutation.error?.message || 'Failed to add feed. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !singleForm.formState.isValid}
            >
              {addFeedMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Feed...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feed
                </>
              )}
            </Button>
          </form>
        ) : (
          /* Batch Import Form */
          <form onSubmit={batchForm.handleSubmit(handleBatchSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="urls" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Feed URLs (one per line)
              </Label>
              <textarea
                id="urls"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={`https://example.com/feed1.xml\nhttps://example.com/feed2.xml\nhttps://example.com/feed3.xml`}
                disabled={isLoading}
                {...batchForm.register('urls')}
              />
              {batchForm.formState.errors.urls && (
                <p className="text-sm text-destructive">
                  {batchForm.formState.errors.urls.message}
                </p>
              )}
            </div>

            {batchAddMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {batchAddMutation.error?.message || 'Failed to import feeds. Please try again.'}
                </AlertDescription>
              </Alert>
            )}

            {batchAddMutation.isSuccess && batchAddMutation.data && (
              <Alert>
                <AlertDescription>
                  Successfully imported {batchAddMutation.data.successfulCount} feeds.
                  {batchAddMutation.data.failedCount > 0 && (
                    <> {batchAddMutation.data.failedCount} feeds failed to import.</>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !batchForm.formState.isValid}
            >
              {batchAddMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Feeds...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Import Feeds
                </>
              )}
            </Button>
          </form>
        )}

        {/* Loading State for Optimistic Updates */}
        {(addFeedMutation.isPending || batchAddMutation.isPending) && (
          <div className="text-sm text-muted-foreground">
            <p>Processing your request...</p>
            {FEATURES.ENABLE_OFFLINE_SUPPORT && (
              <p className="text-xs">Changes will be synced when connection is restored.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}