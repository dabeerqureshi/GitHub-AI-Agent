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
      await loadModelsConfig(true);
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
      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
        {/* Page Header */}
        <div className="pb-5 border-b border-slate-800">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="h-6 w-6 text-indigo-400" />
            <span>AI Model &amp; Provider Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Configure primary AI models, API keys, fallback routes, and privacy guardrails.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Provider Selection */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">Select Active Provider</h3>
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
                    className={`p-3.5 rounded-xl text-left transition-all border cursor-pointer ${
                      isSelected
                        ? "bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{p.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                      {p.model}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.type}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model & Credentials */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-white">Configuration &amp; API Key</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Model ID</label>
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {selectedProvider !== "ollama" && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key (persisted securely to .env)..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}

              {/* Privacy Guardrail */}
              <div className="pt-2">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start space-x-3">
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-white">Cloud Privacy Guardrail</div>
                    <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                      When enabled, source code fragments may be routed to the configured cloud provider for reasoning. Local-only mode falls back to Ollama.
                    </p>
                    <label className="flex items-center space-x-2 mt-2.5 text-white cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allowCloudCode}
                        onChange={(e) => setAllowCloudCode(e.target.checked)}
                        className="rounded accent-indigo-600 h-4 w-4"
                      />
                      <span className="text-xs">Allow cloud code analysis</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Test & Save Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className={`h-3 w-3 ${testing ? "animate-spin text-indigo-400" : ""}`} />
                <span>Test Connection</span>
              </button>

              {testResult && (
                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded-md border ${
                    testResult.is_available
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25"
                      : "text-rose-400 bg-rose-500/10 border-rose-500/25"
                  }`}
                >
                  {testResult.is_available ? "Connection Verified" : testResult.error_message || "Test Failed"}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 self-end sm:self-auto">
              {saved && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Config Saved to .env</span>
                </span>
              )}
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Save &amp; Activate
              </button>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
