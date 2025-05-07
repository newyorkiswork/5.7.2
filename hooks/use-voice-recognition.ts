"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseVoiceRecognitionProps {
  onResult: (text: string) => void
  onError?: (error: Error) => void
}

class MockHumeVoiceSDK {
  private apiKey: string
  private voiceId: string
  private _isRecording: boolean = false

  constructor(config: { apiKey: string; voiceId: string }) {
    this.apiKey = config.apiKey
    this.voiceId = config.voiceId
    console.log("Initializing Mock Hume SDK with:", {
      apiKey: this.apiKey.substring(0, 4) + "...",
      voiceId: this.voiceId.substring(0, 4) + "...",
    })
  }

  async warmup() {
    await new Promise((resolve) => setTimeout(resolve, 300))
    console.log("Mock Hume SDK warmed up")
  }

  async start() {
    console.log("Started recording with Mock Hume SDK")
    this._isRecording = true
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (error) {
      console.error("Microphone permission denied:", error)
      throw new Error("Microphone permission denied")
    }
  }

  async stop() {
    console.log("Stopped recording with Mock Hume SDK")
    this._isRecording = false
    const mockResponses = [
      "show me iphone 15 pro",
      "find running shoes under $100",
      "search for samsung tvs",
      "looking for headphones by sony",
      "show me kitchen appliances",
    ]
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
    return { transcript: randomResponse }
  }

  isRecording() {
    return this._isRecording
  }
}

export function useVoiceRecognition({ onResult, onError }: UseVoiceRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const humeSDKRef = useRef<MockHumeVoiceSDK | null>(null)

  useEffect(() => {
    const initializeHumeSDK = async () => {
      try {
        if (!process.env.NEXT_PUBLIC_HUME_API_KEY || !process.env.NEXT_PUBLIC_HUME_VOICE_ID) {
          throw new Error("Hume API key or Voice ID not found in environment variables")
        }

        const mockHumeSDK = new MockHumeVoiceSDK({
          apiKey: process.env.NEXT_PUBLIC_HUME_API_KEY,
          voiceId: process.env.NEXT_PUBLIC_HUME_VOICE_ID,
        })

        await mockHumeSDK.warmup()
        humeSDKRef.current = mockHumeSDK
        setIsInitialized(true)
      } catch (error) {
        console.error("Failed to initialize Hume SDK:", error)
        onError?.(error instanceof Error ? error : new Error("Failed to initialize Hume SDK"))
      }
    }

    initializeHumeSDK()
  }, [onError])

  const startRecording = useCallback(async () => {
    if (!isInitialized || !humeSDKRef.current) {
      onError?.(new Error("Hume SDK not initialized"))
      return
    }

    try {
      setIsLoading(true)
      await humeSDKRef.current.start()
      setIsRecording(true)
    } catch (error) {
      console.error("Failed to start recording:", error)
      onError?.(error instanceof Error ? error : new Error("Failed to start recording"))
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, onError])

  const stopRecording = useCallback(async () => {
    if (!isInitialized || !humeSDKRef.current || !isRecording) {
      return
    }

    try {
      setIsLoading(true)
      const result = await humeSDKRef.current.stop()
      setIsRecording(false)
      onResult(result.transcript)
    } catch (error) {
      console.error("Failed to stop recording:", error)
      onError?.(error instanceof Error ? error : new Error("Failed to stop recording"))
    } finally {
      setIsLoading(false)
    }
  }, [isInitialized, isRecording, onResult, onError])

  return {
    isRecording,
    isInitialized,
    isLoading,
    startRecording,
    stopRecording,
  }
}
