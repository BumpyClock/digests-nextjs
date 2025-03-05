"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchReaderView, type ReaderViewResponse } from "@/lib/rss"
import { useToast } from "@/hooks/use-toast"
import { BaseModal } from "./base-modal"

interface ReaderViewModalProps {
  isOpen: boolean
  onClose: () => void
  articleUrl: string
  initialPosition: { x: number; y: number; width: number; height: number }
}

export function ReaderViewModal({ isOpen, onClose, articleUrl, initialPosition }: ReaderViewModalProps) {
  const [readerView, setReaderView] = useState<ReaderViewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    async function loadReaderView() {
      setLoading(true)
      try {
        const readerViewData = await fetchReaderView([articleUrl])
        if (readerViewData.length > 0 && readerViewData[0].status === "ok") {
          setReaderView(readerViewData[0])
        }
      } catch (error) {
        console.error("Error fetching reader view:", error)
        toast({
          title: "Error",
          description: "Failed to load reader view. Please try again.",
          variant: "destructive",
        })
      }
      setLoading(false)
    }

    if (isOpen) {
      loadReaderView()
    }
  }, [isOpen, articleUrl, toast])

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={readerView?.title || "Loading..."}
      link={articleUrl}
      initialPosition={initialPosition}
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : readerView ? (
        <article>
          {readerView.image && (
            <img
              src={readerView.image || "/placeholder.svg"}
              alt={readerView.title}
              className="w-full h-auto mb-6 rounded-lg"
            />
          )}
          <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-6">
            {readerView.favicon && (
              <img
                src={readerView.favicon || "/placeholder.svg"}
                alt={readerView.siteName}
                className="w-4 h-4 rounded"
              />
            )}
            <span>{readerView.siteName}</span>
            <span>•</span>
            <span>4 minute read</span>
          </div>
          <div className="prose prose-lg dark:prose-invert" dangerouslySetInnerHTML={{ __html: readerView.content }} />
        </article>
      ) : (
        <div className="text-center">
          <p>Failed to load reader view. Please try again.</p>
        </div>
      )}
    </BaseModal>
  )
}

