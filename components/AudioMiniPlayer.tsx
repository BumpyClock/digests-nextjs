"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Pause, Maximize2 } from "lucide-react"
import { useAudio } from "./AudioContext"

export function AudioMiniPlayer() {
  const { currentAudio, isPlaying, togglePlayPause, toggleMinimize } = useAudio()

  if (!currentAudio) return null

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          {currentAudio.image && (
            <div className="w-12 h-12 rounded overflow-hidden mr-3 flex-shrink-0">
              <img
                src={currentAudio.image || "/placeholder.svg"}
                alt={currentAudio.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="w-full pr-8">
            <div className="font-medium truncate">{currentAudio.title}</div>
            <div className="text-xs text-muted-foreground">{currentAudio.source}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2" onClick={toggleMinimize}>
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between">
          <Button variant="default" size="sm" className="px-2" onClick={togglePlayPause}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="ml-2">{isPlaying ? "Pause" : "Play"}</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

