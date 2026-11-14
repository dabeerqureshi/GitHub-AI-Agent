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
    badge: "Gemini 3.8 Series",
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

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider);
    const provConfig = modelsConfig?.providers?.[provider];
    if (provConfig) {
      setSelectedModel(provConfig.model || provConfig.supported_models[0] || "");
    }
    setCustomModel("");
    setApiKey("");
    setTestResult(null);
    setErrorMessage(null);
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

      setTestResult({
        success: res.is_available,
        message: res.is_available
          ? `Connected to ${finalModel} (${res.latency_ms}ms)`
          : (res.error_message || "Failed to reach model provider"),
        latency: res.latency_ms,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Failed to reach model provider endpoint",
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

      setSuccessMessage(`Activated ${finalModel} (${selectedProvider}) as primary engine!`);
      setTimeout(() => {
        setModelModalOpen(false);
        setSuccessMessage(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save model settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl p-6 rounded-lg bg-[#252526] border border-[#3c3c3c] shadow-2xl animate-slide-up text-[#cccccc] max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#333333]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-md bg-[#007acc]/15 text-[#3794ff] border border-[#007acc]/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-base tracking-tight text-white">AI Engine &amp; Model Configuration</h3>
                <span className="text-[10px] bg-[#007acc]/20 text-[#3794ff] border border-[#007acc]/30 px-2 py-0.5 rounded font-mono">
                  Multi-LLM
                </span>
              </div>
              <p className="text-xs text-[#858585] mt-0.5">
                Configure AI providers with fallback and local execution options
              </p>
            </div>
          </div>
          <button
            onClick={() => setModelModalOpen(false)}
            className="p-1.5 rounded-md text-[#858585] hover:text-white hover:bg-[#2a2d2e] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Provider Selection Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {Object.entries(PROVIDER_METADATA).map(([pid, meta]) => {
            const Icon = meta.icon;
            const isSelected = selectedProvider === pid;
            const isConfigured = modelsConfig?.providers?.[pid]?.has_key;

            return (
              <button
                key={pid}
                type="button"
                onClick={() => handleProviderChange(pid)}
                className={`flex flex-col items-center justify-center p-3 rounded-md border text-center transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#007acc]/20 border-[#007acc] text-white font-semibold shadow-xs"
                    : "bg-[#1e1e1e] border-[#333333] hover:bg-[#2a2d2e] text-[#858585] hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5 mb-1 text-[#3794ff]" />
                <span className="text-xs font-medium">{meta.name}</span>
                <span
                  className={`text-[9px] mt-1.5 font-mono px-2 py-0.5 rounded-full ${
                    isConfigured
                      ? "text-[#73c991] bg-[#73c991]/15 border border-[#73c991]/25"
                      : pid === "ollama"
                      ? "text-[#3794ff] bg-[#3794ff]/15"
                      : "text-[#858585] bg-[#252526]"
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
          <div className="flex items-center justify-between p-3.5 rounded-md bg-[#1e1e1e] border border-[#333333] text-xs">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded text-xs font-semibold bg-[#007acc]/15 border border-[#007acc]/30 text-[#3794ff]">
                {PROVIDER_METADATA[selectedProvider]?.name}
              </span>
              <span className="text-[#858585] text-xs truncate max-w-[280px]">
                {currentProviderConfig?.description}
              </span>
            </div>

            {PROVIDER_METADATA[selectedProvider]?.link && (
              <a
                href={PROVIDER_METADATA[selectedProvider].link}
                target="_blank"
                rel="noreferrer"
                className="text-[#3794ff] hover:underline text-xs font-medium shrink-0 ml-2"
              >
                Get API Key &rarr;
              </a>
            )}
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#cccccc] flex items-center justify-between">
              <span>Select Model</span>
              <span className="text-[11px] text-[#858585] font-mono">
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
                className="w-full px-3 py-2 text-xs bg-[#1e1e1e] border border-[#333333] rounded-md text-white font-mono focus:outline-none focus:border-[#007acc]"
              >
                {supportedModels.map((m) => (
                  <option key={m} value={m} className="bg-[#252526] text-white">
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Or enter custom model ID..."
                className="w-full px-3 py-2 text-xs bg-[#1e1e1e] border border-[#333333] rounded-md text-white font-mono focus:outline-none focus:border-[#007acc] placeholder:text-[#858585]"
              />
            </div>
          </div>

          {/* API Key Input (if not local Ollama) */}
          {selectedProvider !== "ollama" ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#cccccc] flex items-center justify-between">
                <span>API Key</span>
                {currentProviderConfig?.has_key && (
                  <span className="text-[11px] text-[#73c991] font-mono flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Key saved ({currentProviderConfig.masked_key})
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#858585]">
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
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-[#1e1e1e] border border-[#333333] rounded-md focus:outline-none focus:border-[#007acc] transition-all text-white placeholder:text-[#858585]"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#858585] hover:text-white transition-colors cursor-pointer"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-md bg-[#1e1e1e] border border-[#333333] text-xs text-[#858585] flex items-center space-x-2.5">
              <ShieldCheck className="h-5 w-5 text-[#73c991] shrink-0" />
              <span>Ollama runs completely locally on your machine. No API key required.</span>
            </div>
          )}

          {/* Cloud Code Consent Toggle */}
          {selectedProvider !== "ollama" && (
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="cloud-consent"
                checked={allowCloudCode}
                onChange={(e) => setAllowCloudCode(e.target.checked)}
                className="rounded border-[#333333] bg-[#1e1e1e] text-[#007acc] focus:ring-[#007acc] h-4 w-4"
              />
              <label htmlFor="cloud-consent" className="text-xs text-[#858585] cursor-pointer">
                Consent to send repository diffs &amp; source queries to {PROVIDER_METADATA[selectedProvider]?.name}
              </label>
            </div>
          )}

          {/* Test Status Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-md border text-xs flex items-center space-x-2.5 animate-fade-in ${
                testResult.success
                  ? "bg-[#73c991]/10 border-[#73c991]/30 text-[#73c991]"
                  : "bg-[#f14c4c]/10 border-[#f14c4c]/30 text-[#f14c4c]"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-md border border-[#f14c4c]/30 bg-[#f14c4c]/10 text-[#f14c4c] text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-md border border-[#73c991]/30 bg-[#73c991]/10 text-[#73c991] text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#333333]">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium bg-[#1e1e1e] hover:bg-[#2a2d2e] text-[#cccccc] hover:text-white rounded-md transition-all cursor-pointer border border-[#333333]"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#3794ff]" />
                  <span>Probing...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 text-[#3794ff]" />
                  <span>Test Connection</span>
                </>
              )}
            </button>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => setModelModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#858585] hover:text-white rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-[#007acc] hover:bg-[#0e639c] text-white disabled:opacity-40 rounded-md shadow-md transition-all cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save &amp; Activate Model</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
