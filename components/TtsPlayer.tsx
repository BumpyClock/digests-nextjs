"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Pause, Play, X } from "lucide-react"
import { useTTS } from "@/hooks/use-tts"

interface Props {
  text: string
  onClose: () => void
}

export function TtsPlayer({ text, onClose }: Props) {
  const { speak, pause, resume, seek, changeRate, cancel, progress, isSpeaking, rate } = useTTS()
  const [localRate, setLocalRate] = useState(rate)

  useEffect(() => {
    speak(text)
    return () => {
      cancel()
      onClose()
    }
  }, [speak, text, onClose, cancel])

  const handleRate = (val: number[]) => {
    setLocalRate(val[0])
    changeRate(val[0])
  }

  const handleSeek = (val: number[]) => {
    seek(val[0] / 100)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 p-3 flex items-center space-x-3">
      <Button variant="ghost" size="icon" onClick={isSpeaking ? pause : resume}>
        {isSpeaking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Slider value={[progress * 100]} max={100} step={1} onValueChange={handleSeek} className="flex-1" />
      <div className="flex items-center space-x-2 w-32">
        <Slider value={[localRate]} min={0.5} max={2} step={0.1} onValueChange={handleRate} />
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
