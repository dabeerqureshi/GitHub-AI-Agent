import { create } from "zustand";
import {
  ApprovalRequest,
  Conversation,
  ConversationMessage,
  GitHubUserProfile,
  ModelsConfigResponse,
  RepositoryRecord,
  connectGitHubToken,
  createConversation,
  disconnectGitHub,
  fetchConversation,
  fetchConversations,
  fetchGitHubAuthStatus,
  fetchModelsConfig,
  fetchPendingApprovals,
  fetchRepositories,
  refreshRepositories,
  sendMessage,
  submitApprovalDecision,
  updateModelConfig,
} from "@/lib/api";
import { streamMessage } from "@/lib/sse";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  activeRepo: string;
  repositories: RepositoryRecord[];
  githubUser: GitHubUserProfile | null;
  isAuthModalOpen: boolean;
  isConnectingToken: boolean;
  modelsConfig: ModelsConfigResponse | null;
  activeProvider: string;
  activeModel: string;
  isModelModalOpen: boolean;
  pendingApprovals: ApprovalRequest[];
  isLoading: boolean;
  isSending: boolean;
  currentPlan: string[];
  streamingStatus: string | null;
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: (title?: string) => Promise<string>;
  setActiveRepo: (repo: string) => void;
  setAuthModalOpen: (open: boolean) => void;
  setModelModalOpen: (open: boolean) => void;
  loadModelsConfig: () => Promise<void>;
  saveModelConfig: (
    provider: string,
    model?: string,
    apiKey?: string,
    allowCloudCode?: boolean
  ) => Promise<void>;
  loadRepositories: () => Promise<void>;
  loadAuthStatus: () => Promise<void>;
  connectToken: (token: string) => Promise<void>;
  disconnectAccount: () => Promise<void>;
  sendUserMessage: (content: string) => Promise<void>;
  loadPendingApprovals: () => Promise<void>;
  handleApprovalDecision: (
    approvalId: string,
    actionHash: string,
    decision: "APPROVE" | "REJECT",
    notes?: string
  ) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  activeConversation: null,
  activeRepo: "octocat/Hello-World",
  repositories: [],
  githubUser: null,
  isAuthModalOpen: false,
  isConnectingToken: false,
  modelsConfig: null,
  activeProvider: "ollama",
  activeModel: "qwen2.5-coder:7b",
  isModelModalOpen: false,
  pendingApprovals: [],
  isLoading: false,
  isSending: false,
  currentPlan: [],
  streamingStatus: null,
  error: null,

  loadConversations: async () => {
    try {
      set({ isLoading: true, error: null });
      const convs = await fetchConversations();
      const safeConvs = Array.isArray(convs) ? convs : [];
      set({ conversations: safeConvs });
      if (safeConvs.length > 0 && !get().activeConversationId) {
        await get().selectConversation(safeConvs[0].id);
      }
    } catch (err: any) {
      set({ error: err.message, conversations: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  selectConversation: async (id: string) => {
    try {
      set({ activeConversationId: id, isLoading: true, error: null });
      const conv = await fetchConversation(id);
      set({
        activeConversation: conv,
        activeRepo: conv.active_repo || get().activeRepo,
      });
      await get().loadPendingApprovals();
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isLoading: false });
    }
  },

  startNewConversation: async (title = "New Workspace Chat") => {
    try {
      set({ isLoading: true, error: null });
      const newConv = await createConversation(title, get().activeRepo);
      set((state) => ({
        conversations: [newConv, ...state.conversations],
        activeConversationId: newConv.id,
        activeConversation: newConv,
        currentPlan: [],
      }));
      return newConv.id;
    } finally {
      set({ isLoading: false });
    }
  },

  setActiveRepo: (repo: string) => {
    set({ activeRepo: repo });
  },

  setAuthModalOpen: (open: boolean) => {
    set({ isAuthModalOpen: open });
  },

  setModelModalOpen: (open: boolean) => {
    set({ isModelModalOpen: open });
  },

  loadModelsConfig: async () => {
    try {
      const config = await fetchModelsConfig();
      set({
        modelsConfig: config,
        activeProvider: config.active_provider,
        activeModel: config.active_model,
      });
    } catch (err: any) {
      console.error("Failed to load models configuration", err);
    }
  },

  saveModelConfig: async (
    provider: string,
    model?: string,
    apiKey?: string,
    allowCloudCode: boolean = true
  ) => {
    try {
      set({ isLoading: true, error: null });
      const updated = await updateModelConfig({
        provider,
        model,
        api_key: apiKey,
        allow_cloud_code: allowCloudCode,
      });
      set({
        modelsConfig: updated,
        activeProvider: updated.active_provider,
        activeModel: updated.active_model,
        isModelModalOpen: false,
      });
    } catch (err: any) {
      set({ error: err.message || "Failed to update model configuration" });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  loadRepositories: async () => {
    try {
      const repos = await fetchRepositories();
      const safeRepos = Array.isArray(repos) ? repos : [];
      set({ repositories: safeRepos });
      if (safeRepos.length > 0 && !get().activeRepo) {
        set({ activeRepo: safeRepos[0].full_name });
      }
    } catch (err: any) {
      console.error("Failed to load repositories", err);
    }
  },

  loadAuthStatus: async () => {
    try {
      const status = await fetchGitHubAuthStatus();
      if (status.is_connected && status.user) {
        set({ githubUser: status.user });
      } else {
        set({ githubUser: null });
      }
    } catch (err: any) {
      console.error("Failed to load auth status", err);
    }
  },

  connectToken: async (token: string) => {
    try {
      set({ isConnectingToken: true, error: null });
      const res = await connectGitHubToken(token);
      set({
        githubUser: res.user,
      });
      // Immediately refresh repos
      await get().loadRepositories();
    } catch (err: any) {
      set({ error: err.message || "Failed to authenticate GitHub token" });
      throw err;
    } finally {
      set({ isConnectingToken: false });
    }
  },

  disconnectAccount: async () => {
    try {
      await disconnectGitHub();
      set({ githubUser: null });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  sendUserMessage: async (content: string) => {
    const { activeConversationId, activeRepo } = get();
    if (!activeConversationId) return;

    // Optimistically add user message to active conversation
    const optimisticUserMsg: ConversationMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: activeConversationId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      isSending: true,
      streamingStatus: "Analyzing natural language instruction...",
      error: null,
      activeConversation: state.activeConversation
        ? {
            ...state.activeConversation,
            messages: [...state.activeConversation.messages, optimisticUserMsg],
          }
        : null,
    }));

    try {
      await streamMessage(activeConversationId, content, activeRepo, {
        onStatus: (data) => {
          set({ streamingStatus: data.message || `Executing: ${data.tool || data.step}` });
        },
        onPlan: (data) => {
          set({ currentPlan: data.plan });
        },
        onApprovalRequired: (data) => {
          if (data.approval) {
            set((state) => ({
              pendingApprovals: [data.approval, ...state.pendingApprovals],
            }));
          }
        },
        onResponse: (data) => {
          // Add verified assistant response
          set((state) => ({
            activeConversation: state.activeConversation
              ? {
                  ...state.activeConversation,
                  messages: [
                    ...state.activeConversation.messages.filter(
                      (m) => m.id !== data.message.id
                    ),
                    data.message,
                  ],
                }
              : null,
          }));
        },
        onError: (err) => {
          set({ error: err.detail || "Stream execution error" });
        },
      });

      // Refresh final state
      await get().selectConversation(activeConversationId);
    } catch {
      // Fallback to standard request
      const response = await sendMessage(activeConversationId, content, activeRepo);
      set({ currentPlan: response.plan || [] });

      if (response.status === "NEEDS_APPROVAL" && response.approval) {
        set((state) => ({
          pendingApprovals: [response.approval!, ...state.pendingApprovals],
        }));
      }

      await get().selectConversation(activeConversationId);
    } finally {
      set({ isSending: false, streamingStatus: null });
    }
  },

  loadPendingApprovals: async () => {
    try {
      const approvals = await fetchPendingApprovals();
      set({ pendingApprovals: approvals });
    } catch (err: any) {
      console.error("Failed to load approvals", err);
    }
  },

  handleApprovalDecision: async (
    approvalId: string,
    actionHash: string,
    decision: "APPROVE" | "REJECT",
    notes?: string
  ) => {
    try {
      set({ isSending: true, error: null });
      await submitApprovalDecision(approvalId, actionHash, decision, notes);
      // Remove from pending
      set((state) => ({
        pendingApprovals: state.pendingApprovals.filter((a) => a.id !== approvalId),
      }));
      // Refresh active conversation to display executed result
      if (get().activeConversationId) {
        await get().selectConversation(get().activeConversationId!);
      }
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isSending: false });
    }
  },
}));
