"use client";

import React, { useState } from "react";
import {
  Cpu,
  Sparkles,
  Zap,
  Bot,
  Globe,
  Server,
  Key,
  ShieldAlert,
  Check,
  RefreshCw,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useChatStore } from "@/store/use-chat-store";
import { testModelConnection } from "@/lib/api";

export default function ModelsSettingsPage() {
  const {
    modelsConfig,
    activeProvider,
    activeModel,
    loadModelsConfig,
    saveModelConfig,
  } = useChatStore();

  const [selectedProvider, setSelectedProvider] = useState(activeProvider || "gemini");
  const [selectedModel, setSelectedModel] = useState(activeModel || "gemini-3.8-flash");
  const [apiKey, setApiKey] = useState("");
  const [allowCloudCode, setAllowCloudCode] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testModelConnection({
        provider: selectedProvider,
        model: selectedModel,
        api_key: apiKey || undefined,
      });
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ is_available: false, error_message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveModelConfig(
        selectedProvider,
        selectedModel,
        apiKey || undefined,
        allowCloudCode
      );
      setSaved(true);
      await loadModelsConfig();
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const providers = [
    { id: "gemini", name: "Google Gemini", model: "gemini-3.8-flash", type: "Cloud Frontier" },
    { id: "openai", name: "OpenAI", model: "gpt-4o", type: "Cloud Frontier" },
    { id: "anthropic", name: "Anthropic Claude", model: "claude-3-5-sonnet-20241022", type: "Cloud Frontier" },
    { id: "openrouter", name: "OpenRouter", model: "meta-llama/llama-3.3-70b-instruct", type: "Multi-Model Gateway" },
    { id: "ollama", name: "Ollama", model: "qwen2.5-coder:7b", type: "100% Local & Offline" },
  ];

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Page Header */}
        <div className="pb-4 border-b border-[#252D3A]">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F1F5F9] flex items-center gap-2">
            <Cpu className="h-6 w-6 text-[#818CF8]" />
            <span>AI Model & Provider Settings</span>
          </h1>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Configure primary AI models, API keys, fallback routes, and privacy guardrails.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider Selection */}
          <div className="p-5 rounded-xl surface-card border border-[#252D3A] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Select Active Provider</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {providers.map((p) => {
                const isSelected = selectedProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setSelectedModel(p.model);
                      setTestResult(null);
                    }}
                    className={`p-3 rounded-lg text-left transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-[#171E2B] border-[#818CF8] text-[#F1F5F9]"
                        : "bg-[#0D1017] border-[#252D3A] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#121722]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-[#F1F5F9]">{p.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[#818CF8]" />}
                    </div>
                    <div className="text-[10px] font-mono text-[#64748B] mt-1 truncate">
                      {p.model}
                    </div>
                    <div className="text-[10px] text-[#94A3B8] mt-0.5">{p.type}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model & Credentials */}
          <div className="p-5 rounded-xl surface-card border border-[#252D3A] space-y-4">
            <h3 className="text-sm font-semibold text-[#F1F5F9]">Configuration & API Key</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#94A3B8] mb-1 font-medium">Model ID</label>
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md bg-[#0D1017] border border-[#252D3A] text-[#F1F5F9] font-mono text-xs focus:outline-none focus:border-[#818CF8]"
                />
              </div>

              {selectedProvider !== "ollama" && (
                <div>
                  <label className="block text-[#94A3B8] mb-1 font-medium">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key (persisted securely to .env)..."
                    className="w-full px-3 py-1.5 rounded-md bg-[#0D1017] border border-[#252D3A] text-[#F1F5F9] font-mono text-xs focus:outline-none focus:border-[#818CF8]"
                  />
                </div>
              )}

              {/* Privacy Guardrail */}
              <div className="pt-2">
                <div className="p-3 rounded-lg bg-[#0D1017] border border-[#252D3A] flex items-start space-x-2.5">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-[#F1F5F9]">Cloud Privacy Guardrail</div>
                    <p className="text-[#94A3B8] text-[11px] mt-0.5">
                      When enabled, source code fragments may be routed to the configured cloud provider for reasoning. Local-only mode falls back to Ollama.
                    </p>
                    <label className="flex items-center space-x-2 mt-2 text-[#F1F5F9] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowCloudCode}
                        onChange={(e) => setAllowCloudCode(e.target.checked)}
                        className="rounded accent-[#818CF8]"
                      />
                      <span>Allow cloud code analysis</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test & Save Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-3.5 py-1.5 rounded-md bg-[#121722] hover:bg-[#171E2B] border border-[#252D3A] text-xs font-medium text-[#F1F5F9] flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${testing ? "animate-spin text-[#818CF8]" : ""}`} />
                <span>Test Connection</span>
              </button>

              {testResult && (
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded ${
                    testResult.is_available
                      ? "text-emerald-400 bg-emerald-500/10"
                      : "text-rose-400 bg-rose-500/10"
                  }`}
                >
                  {testResult.is_available ? "Connection Verified" : testResult.error_message || "Test Failed"}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {saved && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>Config Saved to .env</span>
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-[#818CF8] hover:bg-[#818CF8]/90 text-[#090B10] font-semibold text-xs rounded-md transition-colors cursor-pointer"
              >
                Save & Activate
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
