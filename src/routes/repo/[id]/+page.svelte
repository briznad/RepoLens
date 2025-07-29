<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getRepoById } from "$lib/services/repository";
  import type { FirestoreRepo } from "$types/repository";
  import type { AnalysisResult } from "$types/analysis";
  import type { ChatMessage } from "$types/chat";
  import ChatLoadingState from '$components/chat/LoadingState.svelte';
  import ChatErrorCard from '$components/chat/ErrorCard.svelte';
  import DocsShortcutCard from '$components/DocsShortcutCard.svelte';
  import ChatMessage from '$components/chat/Message.svelte';
  import ChatTypingIndicator from '$components/chat/TypingIndicator.svelte';
  import ChatInput from '$components/chat/Input.svelte';

  const repoId = $derived($page.params.id);

  // State management
  let repo = $state<FirestoreRepo | null>(null);
  let analysis = $state<AnalysisResult | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Chat state
  let messages = $state<ChatMessage[]>([]);
  let currentMessage = $state("");
  let isStreaming = $state(false);
  let messagesContainer: HTMLElement;

  // Load repository data and initialize chat
  onMount(async () => {
    if (!repoId) {
      error = "Repository ID not found";
      loading = false;
      return;
    }

    try {
      const repoData = await getRepoById(repoId);
      if (!repoData) {
        error = "Repository not found";
        loading = false;
        return;
      }

      repo = repoData;
      analysis = repoData.analysisData || null;

      if (!analysis) {
        error = "Repository analysis not available";
        loading = false;
        return;
      }

      // Initialize with welcome message
      initializeChat();
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load repository";
    } finally {
      loading = false;
    }
  });

  // Auto-scroll to latest messages using effect
  $effect(() => {
    if (messagesContainer && messages.length > 0) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  // Initialize chat with contextual welcome message
  function initializeChat() {
    if (!repo || !analysis) return;

    const framework = analysis.framework;
    const subsystemCount = analysis.subsystems.length;
    const repoName = repo.name;

    const welcomeMessage: ChatMessage = {
      id: "1",
      content: `Hi! I'm Iris 👋 I've analyzed the **${repoName}** ${framework} repository and created documentation for **${subsystemCount} subsystems**. I can help you navigate the docs and understand the codebase.

**What I can help with:**
• Navigate to specific [documentation pages](/repo/${repoId}/docs)
• Explain subsystems and their relationships
• Find specific files and functions
• Understand architectural patterns

What would you like to explore?`,
      role: "assistant",
      timestamp: new Date().toISOString(),
    };

    messages = [welcomeMessage];
  }

  // Send message to chat API
  async function sendMessage() {
    if (!currentMessage.trim() || isStreaming || !repo || !analysis) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: currentMessage.trim(),
      role: "user",
      timestamp: new Date().toISOString(),
    };

    messages = [...messages, userMessage];
    const messageText = currentMessage;
    currentMessage = "";
    isStreaming = true;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          repoId,
          repositoryData: repo,
          analysisData: analysis,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: data.message,
          role: "assistant",
          timestamp: new Date().toISOString(),
        };

        messages = [...messages, assistantMessage];
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content:
          "Sorry, I encountered an error processing your message. Please try again.",
        role: "assistant",
        timestamp: new Date().toISOString(),
      };
      messages = [...messages, errorMessage];
    } finally {
      isStreaming = false;
    }
  }

  // Handle enter key in input
  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  // Copy message content to clipboard
  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      // Could add a toast notification here
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  }

  // Navigate to documentation page
  function navigateToDocumentation(subsystemName?: string) {
    if (subsystemName) {
      goto(`/repo/${repoId}/docs/${encodeURIComponent(subsystemName)}`);
    } else {
      goto(`/repo/${repoId}/docs`);
    }
  }

</script>

{#if loading}
  <ChatLoadingState />
{:else if error}
  <ChatErrorCard {error} {repoId} />
{:else if repo && analysis}
  <ion-content class="ion-padding">
    <div class="chat-container">
      <!-- Quick Documentation Access -->
      <DocsShortcutCard 
        subsystemCount={analysis.subsystems.length}
        onNavigate={() => navigateToDocumentation()}
      />

      <!-- Chat Messages -->
      <div class="messages-container" bind:this={messagesContainer}>
        {#each messages as message}
          <ChatMessage {message} onCopy={copyMessage} />
        {/each}

        <!-- Streaming indicator -->
        {#if isStreaming}
          <ChatTypingIndicator />
        {/if}
      </div>
    </div>
  </ion-content>

  <!-- Fixed Input Area -->
  <ChatInput 
    {currentMessage}
    {isStreaming}
    onMessageChange={(message) => currentMessage = message}
    onSendMessage={sendMessage}
    onKeyPress={handleKeyPress}
  />
{/if}

<style lang="scss">
  // Chat Container
  .chat-container {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 120px; // Space for fixed input
  }

  // Messages Container
  .messages-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100vh - 300px);
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  // Mobile Responsiveness
  @media (max-width: 768px) {
    .chat-container {
      padding-bottom: 140px;
    }
  }

  // Scrollbar Styling
  .messages-container::-webkit-scrollbar {
    width: 4px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: var(--ion-color-medium-tint);
    border-radius: 2px;
  }

  .messages-container::-webkit-scrollbar-thumb:hover {
    background: var(--ion-color-medium);
  }
</style>
