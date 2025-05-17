"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTtsSettingsStore, TtsProvider } from "@/store/useTtsSettingsStore"
import { useApiConfigStore } from "@/store/useApiConfigStore"
import { DEFAULT_API_CONFIG } from "@/lib/config"
import { workerService } from "@/services/worker-service"
import { AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ApiSettingsTab() {
  const { config, setApiUrl, resetToDefault, isValidUrl } = useApiConfigStore();
  const [inputUrl, setInputUrl] = useState(config.baseUrl);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    { success: boolean; message: string } | null
  >(null);

  const { provider, apiKeys, voice, setProvider, setApiKey, setVoice } = useTtsSettingsStore();
  const [selectedProvider, setSelectedProvider] = useState<TtsProvider>(provider);
  const [selectedVoice, setSelectedVoice] = useState(voice);
  const [ttsKey, setTtsKey] = useState(apiKeys[provider] || "");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setTtsKey(apiKeys[selectedProvider] || "");
  }, [selectedProvider, apiKeys]);

  useEffect(() => {
    setSelectedVoice(voice);
  }, [voice]);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        if (!selectedVoice && voices.length > 0) {
          setSelectedVoice(voices[0].name);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Initialize input field when component mounts
  useEffect(() => {
    setInputUrl(config.baseUrl);
  }, [config.baseUrl]);

  // Test connection function
  const testConnection = async () => {
    if (!isValidUrl(inputUrl)) {
      setConnectionStatus({
        success: false,
        message: "Invalid URL format. Please enter a valid URL."
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Use the parse endpoint with a known valid RSS feed to test connection
      const response = await fetch(`${inputUrl}/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: ['https://www.theverge.com/rss/index.xml'] })
      });

      if (response.ok) {
        setConnectionStatus({
          success: true,
          message: "Connection successful! API endpoint is reachable."
        });
      } else {
        setConnectionStatus({
          success: false,
          message: `Connection failed with status: ${response.status}`
        });
      }
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save API URL
  const saveApiUrl = () => {
    if (!isValidUrl(inputUrl)) {
      setConnectionStatus({
        success: false,
        message: "Invalid URL format. Please enter a valid URL."
      });
      return;
    }

    setApiUrl(inputUrl);
    workerService.updateApiUrl(inputUrl);
    setConnectionStatus({
      success: true,
      message: "API endpoint saved successfully."
    });
  };

  // Reset to default
  const handleResetToDefault = () => {
    resetToDefault();
    setInputUrl(DEFAULT_API_CONFIG.baseUrl);
    workerService.updateApiUrl(DEFAULT_API_CONFIG.baseUrl);
    setConnectionStatus({
      success: true,
      message: "Reset to default API endpoint."
    });
  };

  const saveTtsSettings = () => {
    setProvider(selectedProvider);
    setApiKey(selectedProvider, ttsKey);
    setVoice(selectedVoice);
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>API Settings</CardTitle>
        <CardDescription>
          Configure the API endpoint for Digests to use a different server
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="api-url">API Endpoint URL</Label>
            <div className="flex items-center gap-2">
              <Input
                id="api-url"
                placeholder="https://api.digests.app"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTestingConnection}
              >
                Test
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              The base URL of the API endpoint (default: {DEFAULT_API_CONFIG.baseUrl})
            </p>
          </div>

          {connectionStatus && (
            <Alert variant={connectionStatus.success ? "default" : "destructive"}>
              {connectionStatus.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {connectionStatus.success ? "Success" : "Error"}
              </AlertTitle>
              <AlertDescription>
                {connectionStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleResetToDefault}
            disabled={inputUrl === DEFAULT_API_CONFIG.baseUrl}
          >
            Reset to Default
          </Button>
          <Button
            onClick={saveApiUrl}
            disabled={inputUrl === config.baseUrl}
          >
            Save Changes
          </Button>
        </div>

        {config.isCustom && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Custom API Endpoint</AlertTitle>
            <AlertDescription>
              You are using a custom API endpoint. Make sure it&apos;s compatible with the Digests API.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Text-to-Speech</CardTitle>
        <CardDescription>Select your preferred TTS engine</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tts-provider">Engine</Label>
          <Select
            value={selectedProvider}
            onValueChange={(val) => setSelectedProvider(val as TtsProvider)}
          >
            <SelectTrigger id="tts-provider" className="w-[180px]">
              <SelectValue placeholder="Select engine" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="edge">Edge</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
              <SelectItem value="openai">OpenAI</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tts-voice">Voice</Label>
          <Select
            value={selectedVoice}
            onValueChange={(val) => setSelectedVoice(val)}
          >
            <SelectTrigger id="tts-voice" className="w-[220px]">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent>
              {availableVoices.map((v) => (
                <SelectItem key={v.name} value={v.name}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedProvider !== 'edge' && (
          <div className="space-y-2">
            <Label htmlFor="tts-key">API Key</Label>
            <Input
              id="tts-key"
              value={ttsKey}
              onChange={(e) => setTtsKey(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Key is stored locally on this device
            </p>
          </div>
        )}
        <Button onClick={saveTtsSettings}>Save TTS Settings</Button>
      </CardContent>
    </Card>
    </>
  );
}