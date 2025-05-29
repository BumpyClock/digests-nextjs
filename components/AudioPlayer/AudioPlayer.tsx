"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AudioControls } from "./AudioControls"
import { AudioMiniPlayer } from "./AudioMiniPlayer"
import Image from "next/image"
import { useAudioStore } from "@/store/useAudioStore"

const AudioControlsWrapper = React.memo(() => <AudioControls />)
AudioControlsWrapper.displayName = 'AudioControlsWrapper'

/**
 * Renders the appropriate audio player based on state
 */
const AudioPlayer = React.memo(() => {
  const { currentAudio, isMinimized, showMiniPlayer } = useAudioStore()

  if (!currentAudio || !showMiniPlayer) return null

  if (isMinimized) {
    return <AudioMiniPlayer />
  }

  return (
    <Card className="fixed bottom-0 left-0 right-0 z-40">
      <CardContent className="p-4 flex items-center">
        <div className="flex items-center flex-1">
          {currentAudio.image && (
            <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
              <Image
                src={currentAudio.image || "/placeholder.svg"}
                alt={currentAudio.title}
                className="w-full h-full object-cover"
                width={48}
                height={48}
              />
            </div>
          )}
          <div className="flex-1">
            <div className="font-medium truncate">{currentAudio.title}</div>
            <div className="text-xs text-muted-foreground">{currentAudio.source}</div>
          </div>
        </div>
        <AudioControlsWrapper />
      </CardContent>
    </Card>
  )
})

AudioPlayer.displayName = "AudioPlayer"

export { AudioPlayer } 