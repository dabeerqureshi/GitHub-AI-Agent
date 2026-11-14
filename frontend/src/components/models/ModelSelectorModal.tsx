"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Cpu,
  Globe,
  Bot,
  Zap,
  Server,
  Layers,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";
import { testModelConnection } from "@/lib/api";

const PROVIDER_METADATA: Record<
  string,
  { name: string; icon: any; color: string; badge: string; link: string }
> = {
  gemini: {
    name: "Gemini",
    icon: Sparkles,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    badge: "Official API",
    link: "https://aistudio.google.com/app/apikey",
  },
  openai: {
    name: "OpenAI",
    icon: Zap,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "GPT-4o Series",
    link: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    name: "Claude",
    icon: Bot,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    badge: "Claude 3.5 Series",
    link: "https://console.anthropic.com/settings/keys",
  },
  openrouter: {
    name: "OpenRouter",
    icon: Globe,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    badge: "100+ Models Gateway",
    link: "https://openrouter.ai/keys",
  },
  ollama: {
    name: "Ollama",
    icon: Server,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    badge: "100% Offline & Private",
    link: "https://ollama.com",
  },
};

export function ModelSelectorModal() {
  const {
    isModelModalOpen,
    setModelModalOpen,
    modelsConfig,
    activeProvider,
    activeModel,
    saveModelConfig,
    loadModelsConfig,
  } = useChatStore();

  const [selectedProvider, setSelectedProvider] = useState<string>("gemini");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [customModel, setCustomModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [allowCloudCode, setAllowCloudCode] = useState<boolean>(true);

  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isModelModalOpen) {
      loadModelsConfig();
      const current = activeProvider || "gemini";
      setSelectedProvider(current);
      setSelectedModel(activeModel || "");
      setApiKey("");
      setTestResult(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isModelModalOpen, activeProvider, activeModel, loadModelsConfig]);

  if (!isModelModalOpen) return null;

  const currentProviderConfig = modelsConfig?.providers?.[selectedProvider];
  const supportedModels = currentProviderConfig?.supported_models || [];

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setTestResult(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    const provConfig = modelsConfig?.providers?.[providerId];
    if (provConfig) {
      setSelectedModel(provConfig.model || provConfig.supported_models[0] || "");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setErrorMessage(null);
    try {
      const finalModel = customModel.trim() || selectedModel;
      const res = await testModelConnection({
        provider: selectedProvider,
        model: finalModel,
        api_key: apiKey.trim() || undefined,
      });

      if (res.is_available) {
        setTestResult({
          success: true,
          message: `Connection successful! Tool calling: ${
            res.supports_tool_calling ? "Supported" : "Basic chat only"
          }`,
          latency: res.latency_ms,
        });
      } else {
        setTestResult({
          success: false,
          message: res.error_message || "Model capability probe reported unavailable",
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to connect to model provider",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const finalModel = customModel.trim() || selectedModel;

    try {
      await saveModelConfig(
        selectedProvider,
        finalModel,
        apiKey.trim() || undefined,
        allowCloudCode
      );
      setSuccessMessage(`Activated ${PROVIDER_METADATA[selectedProvider]?.name || selectedProvider} (${finalModel})!`);
      setTimeout(() => {
        setModelModalOpen(false);
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update model configuration");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl p-6 rounded-2xl glass-panel border border-border shadow-2xl animate-slide-up text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg tracking-tight">AI Engine & Model Configuration</h3>
              <p className="text-xs text-muted-foreground">
                Select your preferred LLM provider, enter API keys, and configure active models
              </p>
            </div>
          </div>
          <button
            onClick={() => setModelModalOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Provider Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">
          {Object.entries(PROVIDER_METADATA).map(([pid, meta]) => {
            const Icon = meta.icon;
            const isSelected = selectedProvider === pid;
            const isConfigured = modelsConfig?.providers?.[pid]?.has_key;

            return (
              <button
                key={pid}
                type="button"
                onClick={() => handleProviderChange(pid)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary text-primary font-semibold shadow-sm"
                    : "bg-secondary/40 border-border/70 hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-medium">{meta.name}</span>
                <span
                  className={`text-[9px] mt-1 font-mono px-1.5 py-0.2 rounded-full ${
                    isConfigured
                      ? "text-emerald-400 bg-emerald-500/10"
                      : pid === "ollama"
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-muted-foreground bg-muted/60"
                  }`}
                >
                  {isConfigured ? "Ready" : pid === "ollama" ? "Local" : "No Key"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Active Provider Info Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/80 text-xs">
            <div className="flex items-center space-x-2.5">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${PROVIDER_METADATA[selectedProvider]?.color}`}>
                {PROVIDER_METADATA[selectedProvider]?.name}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {currentProviderConfig?.description}
              </span>
            </div>

            {PROVIDER_METADATA[selectedProvider]?.link && (
              <a
                href={PROVIDER_METADATA[selectedProvider].link}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline text-[11px] font-mono shrink-0 ml-2"
              >
                Get API Key &rarr;
              </a>
            )}
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground flex items-center justify-between">
              <span>Select Model</span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Active: {currentProviderConfig?.model || selectedModel}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  setCustomModel("");
                }}
                className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded-xl text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              >
                {supportedModels.map((m) => (
                  <option key={m} value={m} className="bg-card text-foreground">
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Or enter custom model ID..."
                className="w-full px-3 py-2 text-xs bg-secondary/50 border border-border rounded-xl text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary placeholder:text-muted-foreground/60"
              />
            </div>
          </div>

          {/* API Key Input (if not local Ollama) */}
          {selectedProvider !== "ollama" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground flex items-center justify-between">
                <span>API Key</span>
                {currentProviderConfig?.has_key && (
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Key saved ({currentProviderConfig.masked_key})
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    currentProviderConfig?.has_key
                      ? "Enter new key to update, or leave blank to keep existing"
                      : `Enter ${PROVIDER_METADATA[selectedProvider]?.name} API key...`
                  }
                  className="w-full pl-9 pr-10 py-2.5 text-xs font-mono bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              <span>Ollama runs completely locally on your machine. No API key required.</span>
            </div>
          )}

          {/* Cloud Code Consent Toggle */}
          {selectedProvider !== "ollama" && (
            <div className="flex items-center space-x-2.5 pt-1">
              <input
                type="checkbox"
                id="cloud-consent"
                checked={allowCloudCode}
                onChange={(e) => setAllowCloudCode(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <label htmlFor="cloud-consent" className="text-xs text-muted-foreground cursor-pointer">
                Consent to send repository diffs & source queries to {PROVIDER_METADATA[selectedProvider]?.name}
              </label>
            </div>
          )}

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center space-x-2 animate-fade-in ${
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium bg-secondary hover:bg-secondary/80 text-foreground rounded-xl transition-all cursor-pointer border border-border"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5 text-primary" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setModelModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-xl shadow-sm shadow-primary/20 transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save & Activate Model</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
