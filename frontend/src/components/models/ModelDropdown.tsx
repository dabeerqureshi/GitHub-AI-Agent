"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Zap,
  Bot,
  Globe,
  Server,
  ChevronDown,
  Check,
  Key,
  Settings2,
  Loader2,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

interface ProviderMeta {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  badge: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    icon: Sparkles,
    color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    badge: "Gemini 3.8 Series",
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: Zap,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    badge: "GPT-4o Series",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    icon: Bot,
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    badge: "Claude 3.5 Series",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: Globe,
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    badge: "100+ Gateway",
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    icon: Server,
    color: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    badge: "100% Offline",
  },
];

interface ModelDropdownProps {
  compact?: boolean;
  align?: "left" | "right";
  direction?: "up" | "down";
}

export function ModelDropdown({
  compact = false,
  align = "right",
  direction = "down",
}: ModelDropdownProps) {
  const {
    modelsConfig,
    activeProvider,
    activeModel,
    loadModelsConfig,
    saveModelConfig,
    setModelModalOpen,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("gemini");
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modelsConfig) {
      loadModelsConfig();
    }
  }, [modelsConfig, loadModelsConfig]);

  useEffect(() => {
    if (activeProvider) {
      setActiveTab(activeProvider);
    }
  }, [activeProvider]);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentProvider = activeProvider || "gemini";
  const currentModel = activeModel || "gemini-3.8-flash";
  const currentMeta = PROVIDERS.find((p) => p.id === currentProvider) || PROVIDERS[0];
  const CurrentIcon = currentMeta.icon;

  const handleSelectModel = async (providerId: string, modelName: string) => {
    const providerConfig = modelsConfig?.providers?.[providerId];
    const isReady = providerConfig?.has_key || providerId === "ollama";

    if (!isReady) {
      // Need API key setup
      setIsOpen(false);
      setModelModalOpen(true);
      return;
    }

    try {
      setIsSwitching(true);
      await saveModelConfig(providerId, modelName);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to switch model:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  const selectedProviderConfig = modelsConfig?.providers?.[activeTab];
  const supportedModels = selectedProviderConfig?.supported_models || [];

  const positionClasses = [
    direction === "up" ? "bottom-full mb-2" : "top-full mt-2",
    align === "left" ? "left-0" : "right-0",
  ].join(" ");

  return (
    <div className="relative inline-block text-left font-sans" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`flex items-center space-x-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all cursor-pointer shadow-sm group select-none ${
          compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        }`}
        title={`Active Engine: ${currentMeta.name} (${currentModel}) - Click to switch`}
      >
        {isSwitching ? (
          <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        ) : (
          <CurrentIcon className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
        )}
        <div className="flex items-center space-x-1.5 font-medium min-w-0">
          <span className="text-slate-300 hidden sm:inline">{currentMeta.name}:</span>
          <span className="text-white font-semibold truncate max-w-[100px] sm:max-w-[140px]">
            {currentModel.split("/").pop()}
          </span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu (100% Solid Opaque Slate, Shadow Elevation) */}
      {isOpen && (
        <div
          className={`absolute ${positionClasses} w-[min(24rem,calc(100vw-1.5rem))] rounded-xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/90 z-50 overflow-hidden animate-slide-up text-slate-200`}
        >
          {/* Dropdown Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-white tracking-wide">Select AI Model</h4>
              <p className="text-[11px] text-slate-400">Choose engine provider &amp; model for chat</p>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setModelModalOpen(true);
              }}
              className="flex items-center space-x-1 text-[11px] text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30 transition-colors cursor-pointer"
              title="Configure API Keys &amp; Advanced Settings"
            >
              <Key className="h-3 w-3" />
              <span>Keys</span>
            </button>
          </div>

          {/* Provider Tabs */}
          <div className="grid grid-cols-5 p-1.5 bg-slate-950 gap-1 border-b border-slate-800">
            {PROVIDERS.map((p) => {
              const Icon = p.icon;
              const isActive = activeTab === p.id;
              const pConfig = modelsConfig?.providers?.[p.id];
              const isConfigured = pConfig?.has_key || p.id === "ollama";

              return (
                <button
                  key={p.id}
                  onClick={() => setActiveTab(p.id)}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-md text-[10px] font-medium transition-all cursor-pointer relative ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                  title={`${p.name} ${isConfigured ? "(Ready)" : "(Needs Key)"}`}
                >
                  <Icon className="h-3.5 w-3.5 mb-0.5" />
                  <span className="truncate max-w-full text-[9px]">{p.name.split(" ")[0]}</span>
                  {isConfigured && (
                    <span
                      className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        isActive ? "bg-white" : "bg-emerald-400"
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Models List for Selected Provider */}
          <div className="p-2 max-h-60 overflow-y-auto space-y-1 bg-slate-900">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">
                {PROVIDERS.find((p) => p.id === activeTab)?.name} Models
              </span>
              {selectedProviderConfig?.has_key ? (
                <span className="text-emerald-400 text-[10px] flex items-center">
                  <Check className="h-3 w-3 mr-0.5" /> Ready
                </span>
              ) : activeTab === "ollama" ? (
                <span className="text-blue-400 text-[10px]">Local Daemon</span>
              ) : (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setModelModalOpen(true);
                  }}
                  className="text-amber-400 text-[10px] hover:underline flex items-center cursor-pointer"
                >
                  <Key className="h-2.5 w-2.5 mr-0.5" /> Setup Key
                </button>
              )}
            </div>

            {supportedModels.map((m) => {
              const isCurrent = activeProvider === activeTab && activeModel === m;

              return (
                <button
                  key={m}
                  onClick={() => handleSelectModel(activeTab, m)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all text-left cursor-pointer ${
                    isCurrent
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold"
                      : "hover:bg-slate-800 text-slate-200 hover:text-white"
                  }`}
                >
                  <span className="truncate pr-2">{m}</span>
                  {isCurrent && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Footer with active switch feedback */}
          <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate">
              Active: <strong className="text-white">{currentModel}</strong>
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                setModelModalOpen(true);
              }}
              className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center cursor-pointer shrink-0 ml-2 font-medium"
            >
              <Settings2 className="h-3 w-3 mr-1" /> All Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
