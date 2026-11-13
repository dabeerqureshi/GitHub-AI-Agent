import { create } from "zustand";
import {
  ApprovalRequest,
  Conversation,
  ConversationMessage,
  createConversation,
  fetchConversation,
  fetchConversations,
  fetchPendingApprovals,
  sendMessage,
  submitApprovalDecision,
} from "@/lib/api";

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  activeConversation: Conversation | null;
  activeRepo: string;
  pendingApprovals: ApprovalRequest[];
  isLoading: boolean;
  isSending: boolean;
  currentPlan: string[];
  error: string | null;

  // Actions
  loadConversations: () => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  startNewConversation: (title?: string) => Promise<string>;
  setActiveRepo: (repo: string) => void;
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
  pendingApprovals: [],
  isLoading: false,
  isSending: false,
  currentPlan: [],
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
      error: null,
      activeConversation: state.activeConversation
        ? {
            ...state.activeConversation,
            messages: [...state.activeConversation.messages, optimisticUserMsg],
          }
        : null,
    }));

    try {
      const response = await sendMessage(activeConversationId, content, activeRepo);
      set({ currentPlan: response.plan || [] });

      if (response.status === "NEEDS_APPROVAL" && response.approval) {
        set((state) => ({
          pendingApprovals: [response.approval!, ...state.pendingApprovals],
        }));
      }

      // Refresh full conversation state
      await get().selectConversation(activeConversationId);
    } catch (err: any) {
      set({ error: err.message });
    } finally {
      set({ isSending: false });
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
