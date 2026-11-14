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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg p-6 rounded-2xl glass-panel border border-border shadow-2xl animate-slide-up text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Github className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg tracking-tight">GitHub Authentication</h3>
              <p className="text-xs text-muted-foreground">
                Connect your account to discover and manage repositories
              </p>
            </div>
          </div>
          <button
            onClick={() => setAuthModalOpen(false)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Connected Profile State */}
        {githubUser ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/80">
              <div className="flex items-center space-x-3.5">
                {githubUser.avatar_url ? (
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-12 h-12 rounded-full border-2 border-primary/40 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {githubUser.login.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm">{githubUser.name || githubUser.login}</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Active
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">@{githubUser.login}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Tracked Repos</span>
                <span className="font-mono text-sm font-semibold text-foreground flex items-center justify-end">
                  <Database className="h-3.5 w-3.5 mr-1 text-primary" />
                  {repositories.length}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-center text-foreground font-medium">
                <ShieldCheck className="h-4 w-4 mr-1.5 text-emerald-400" />
                Zero-Leak Token Architecture
              </div>
              <p>
                Your GitHub token is encrypted on the server with AES-Fernet encryption and strictly
                protected from browser exposure.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleDisconnect}
                className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-destructive/20"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Disconnect Account</span>
              </button>

              <button
                onClick={() => setAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated Connect Form */
          <form onSubmit={handleConnect} className="space-y-4">
            {errorMsg && (
              <div className="flex items-start space-x-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs animate-fade-in">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center space-x-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs animate-fade-in">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">
                Personal Access Token (PAT)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Key className="h-4 w-4" />
                </div>
                <input
                  type={showToken ? "text" : "password"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="github_pat_... or ghp_..."
                  className="w-full pl-9 pr-10 py-2.5 text-xs font-mono bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Optional Specific Repository */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-foreground">
                Specific Repository <span className="text-muted-foreground font-normal">(Optional, e.g. username/repo)</span>
              </label>
              <input
                type="text"
                value={targetRepoInput}
                onChange={(e) => setTargetRepoInput(e.target.value)}
                placeholder="e.g. your-name/your-repository"
                className="w-full px-3 py-2 text-xs font-mono bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground placeholder:text-muted-foreground/60"
              />
              <p className="text-[11px] text-muted-foreground">
                Useful if your Fine-Grained PAT is scoped to selected repositories.
              </p>
            </div>

            {/* Scopes Guide */}
            <div className="p-3.5 rounded-xl bg-secondary/30 border border-border text-xs space-y-2">
              <span className="font-medium text-foreground flex items-center">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                Token Setup Requirements
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-secondary font-mono text-[11px] text-muted-foreground border">
                  Contents: Read &amp; write
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary font-mono text-[11px] text-muted-foreground border">
                  Issues: Read &amp; write
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary font-mono text-[11px] text-muted-foreground border">
                  Pull requests: Read &amp; write
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                For Fine-grained tokens: In &quot;Repository access&quot;, select &quot;All repositories&quot; or choose your specific repositories. Under &quot;Repository permissions&quot;, enable Contents, Issues, and Pull Requests.
              </p>
              <a
                href="https://github.com/settings/tokens/new?scopes=repo,read:org,workflow&description=GitHub-AI-Workspace"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] text-primary hover:underline pt-1"
              >
                <span>Generate a token on GitHub</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isConnectingToken || !tokenInput.trim()}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-sm transition-all shadow-primary/20"
              >
                {isConnectingToken ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <span>Connect & Sync Repos</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
