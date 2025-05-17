"use client"

import { useCallback, useRef, useState } from "react"
import { useTtsSettingsStore } from "@/store/useTtsSettingsStore"

interface TtsControls {
  speak: (text: string) => void
  pause: () => void
  resume: () => void
  cancel: () => void
  seek: (progress: number) => void
  changeRate: (rate: number) => void
  progress: number
  isSpeaking: boolean
  rate: number
}

export function useTTS(): TtsControls {
  const { provider, voice, rate: rateSetting, setRate } = useTtsSettingsStore()
  const [progress, setProgress] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const textRef = useRef<string>("")
  const indexRef = useRef(0)

  const createUtterance = useCallback(
    (start: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return null
      }
      const utter = new SpeechSynthesisUtterance(textRef.current.slice(start))
      const voices = window.speechSynthesis.getVoices()
      if (voice) {
        const v = voices.find((vo) => vo.name === voice)
        if (v) utter.voice = v
      }
      utter.rate = rateSetting
      utter.onboundary = (e) => {
        indexRef.current = start + e.charIndex
        setProgress(indexRef.current / textRef.current.length)
      }
      utter.onend = () => {
        setProgress(1)
        setIsSpeaking(false)
      }
      return utter
    },
    [voice, rateSetting],
  )

  const speak = useCallback(
    (text: string) => {
      if (!text) return
      textRef.current = text
      indexRef.current = 0
      setProgress(0)
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
        const utter = createUtterance(0)
        if (!utter) return
        setIsSpeaking(true)
        window.speechSynthesis.speak(utter)
      }
    },
    [createUtterance],
  )

  const pause = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause()
      setIsSpeaking(false)
    }
  }, [])

  const resume = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.resume()
      setIsSpeaking(true)
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setProgress(0)
    }
  }, [])

  const seek = useCallback(
    (p: number) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return
      const idx = Math.floor(p * textRef.current.length)
      window.speechSynthesis.cancel()
      const utter = createUtterance(idx)
      if (!utter) return
      setProgress(idx / textRef.current.length)
      indexRef.current = idx
      setIsSpeaking(true)
      window.speechSynthesis.speak(utter)
    },
    [createUtterance],
  )

  const changeRate = useCallback(
    (r: number) => {
      setRate(r)
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        isSpeaking
      ) {
        const idx = indexRef.current
        window.speechSynthesis.cancel()
        const utter = createUtterance(idx)
        if (!utter) return
        setProgress(idx / textRef.current.length)
        window.speechSynthesis.speak(utter)
      }
    },
    [createUtterance, isSpeaking, setRate],
  )

  return { speak, pause, resume, cancel, seek, changeRate, progress, isSpeaking, rate: rateSetting }
}
