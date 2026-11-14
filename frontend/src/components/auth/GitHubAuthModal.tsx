"use client";

import React, { useState } from "react";
import {
  X,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Github,
  Database,
} from "lucide-react";
import { useChatStore } from "@/store/use-chat-store";

export function GitHubAuthModal() {
  const {
    isAuthModalOpen,
    setAuthModalOpen,
    githubUser,
    connectToken,
    disconnectAccount,
    isConnectingToken,
    repositories,
  } = useChatStore();

  const [tokenInput, setTokenInput] = useState("");
  const [targetRepoInput, setTargetRepoInput] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await connectToken(tokenInput.trim(), targetRepoInput.trim() || undefined);
      setSuccessMsg("Successfully verified and connected to GitHub!");
      setTokenInput("");
      setTargetRepoInput("");
      setTimeout(() => {
        setAuthModalOpen(false);
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate token");
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectAccount();
      setTokenInput("");
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg("Failed to disconnect account");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl animate-slide-up text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Github className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base tracking-tight text-white">GitHub Authentication</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Connect your personal access token to discover and manage repositories
              </p>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Connected Profile State */}
        {githubUser ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="flex items-center space-x-3">
                {githubUser.avatar_url ? (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-11 h-11 rounded-full border border-indigo-400/50 shadow-sm"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                    {githubUser.login.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-white">{githubUser.name || githubUser.login}</span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium flex items-center">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">@{githubUser.login}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-sans">Tracked Repos</span>
                <span className="font-mono text-sm font-semibold text-white flex items-center justify-end mt-0.5">
                  <Database className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                  {repositories.length}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <div className="flex items-center text-white font-medium">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
                Zero-Leak Token Architecture
              </div>
              <p className="text-[11px] leading-relaxed">
                Your GitHub token is encrypted on the server with AES-Fernet encryption and strictly
                protected from browser exposure.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/30 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect Account</span>
              </button>

              <button
                onClick={() => setAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated Connect Form */
          <form onSubmit={handleConnect} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start space-x-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs animate-fade-in">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs animate-fade-in">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Personal Access Token (PAT)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="github_pat_... or ghp_..."
                  className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 transition-all text-white placeholder:text-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Optional Specific Repository */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Specific Repository <span className="text-slate-500 font-normal">(Optional, e.g. username/repo)</span>
              </label>
              <input
                type="text"
                value={targetRepoInput}
                onChange={(e) => setTargetRepoInput(e.target.value)}
                placeholder="e.g. your-name/your-repository"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg focus:outline-none focus:border-indigo-500 transition-all text-white placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-500">
                Useful if your Fine-Grained PAT is scoped to selected repositories.
              </p>
            </div>

            {/* Scopes Guide */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5">
              <span className="font-medium text-white flex items-center">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-indigo-400" />
                Token Setup Requirements
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-300 border border-slate-800">
                  Contents: Read &amp; write
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-300 border border-slate-800">
                  Issues: Read &amp; write
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 font-mono text-[10px] text-slate-300 border border-slate-800">
                  Pull requests: Read &amp; write
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                For Fine-grained tokens: In &quot;Repository access&quot;, select &quot;All repositories&quot; or choose your specific repositories. Under &quot;Repository permissions&quot;, enable Contents, Issues, and Pull Requests.
              </p>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=GitHub-AI-Workspace"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 hover:underline pt-0.5 cursor-pointer"
              >
                <span>Generate a token on GitHub</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnectingToken || !tokenInput.trim()}
                className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all shadow-md cursor-pointer"
              >
                {isConnectingToken ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Connect &amp; Sync Repos</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
