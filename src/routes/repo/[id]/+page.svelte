<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { getRepoById } from "$lib/services/repository";
  import type { FirestoreRepo } from "$types/repository";
  import type { AnalysisResult } from "$types/analysis";
  import type { ChatMessage } from "$types/chat";
  import { warningOutline, libraryOutline, refresh, bookOutline, copyOutline, sparklesOutline } from 'ionicons/icons';

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
  let messageInput: HTMLIonInputElement;

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

  // Format timestamp
  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Process message content for links and special formatting
  function processMessageContent(content: string): string {
    // Convert markdown links to HTML
    return content
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener">$1</a>'
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }
</script>

{#if loading}
  <ion-content class="ion-padding">
    <div class="loading-container">
      <ion-spinner name="dots"></ion-spinner>
      <p>Loading repository chat...</p>
    </div>
  </ion-content>
{:else if error}
  <ion-content class="ion-padding">
    <div class="error-container">
      <ion-card class="error-card">
        <ion-card-header>
          <ion-card-title color="danger">
            <ion-icon icon={warningOutline}></ion-icon>
            Chat Unavailable
          </ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{error}</p>
          <div class="error-actions">
            <ion-button
              fill="outline"
              onclick={() => goto(`/repo/${repoId}/docs`)}
            >
              <ion-icon icon={libraryOutline} slot="start"></ion-icon>
              View Documentation
            </ion-button>
            <ion-button fill="solid" onclick={() => window.location.reload()}>
              <ion-icon icon={refresh} slot="start"></ion-icon>
              Retry
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </div>
  </ion-content>
{:else if repo && analysis}
  <ion-content class="ion-padding">
    <div class="chat-container">
      <!-- Quick Documentation Access -->
      <ion-card class="docs-shortcut-card">
        <ion-card-content>
          <div class="docs-shortcut">
            <div class="docs-info">
              <ion-icon icon={libraryOutline} class="docs-icon"></ion-icon>
              <div>
                <h4>Repository Documentation</h4>
                <p>
                  Comprehensive documentation for {analysis.subsystems.length} subsystems
                </p>
              </div>
            </div>
            <ion-button
              fill="outline"
              onclick={() => navigateToDocumentation()}
            >
              <ion-icon icon={bookOutline} slot="start"></ion-icon>
              View Docs
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Chat Messages -->
      <div class="messages-container" bind:this={messagesContainer}>
        {#each messages as message}
          <div
            class="message-wrapper {message.role === 'user'
              ? 'user-message'
              : 'ai-message'}"
          >
            <div class="message-bubble">
              <div class="message-header">
                <div class="message-sender">
                  <ion-icon
                    name={message.role === "user"
                      ? "person-circle-outline"
                      : "sparkles-outline"}
                  ></ion-icon>
                  <span class="sender-name"
                    >{message.role === "user" ? "You" : "Iris"}</span
                  >
                </div>
                <div class="message-actions">
                  <span class="timestamp">{formatTime(message.timestamp)}</span>
                  <ion-button
                    fill="clear"
                    size="small"
                    onclick={() => copyMessage(message.content)}
                    title="Copy message"
                  >
                    <ion-icon icon={copyOutline} slot="icon-only"></ion-icon>
                  </ion-button>
                </div>
              </div>
              <div
                class="message-content"
                innerHTML={processMessageContent(message.content)}
              ></div>
            </div>
          </div>
        {/each}

        <!-- Streaming indicator -->
        {#if isStreaming}
          <div class="message-wrapper ai-message">
            <div class="message-bubble streaming">
              <div class="message-header">
                <div class="message-sender">
                  <ion-icon icon={sparklesOutline}></ion-icon>
                  <span class="sender-name">Iris</span>
                </div>
              </div>
              <div class="message-content">
                <div class="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </ion-content>

  <!-- Fixed Input Area -->
  <ion-footer>
    <ion-toolbar>
      <div class="input-container">
        <ion-item class="message-input-item">
          <ion-textarea
            placeholder="Ask Iris about the repository..."
            value={currentMessage}
            onionInput={(e: any) => (currentMessage = e.detail.value)}
            onkeydown={handleKeyPress}
            rows={1}
            auto-grow={true}
            class="message-input"
            bind:this={messageInput}
          ></ion-textarea>
          <ion-button
            slot="end"
            onclick={sendMessage}
            fill="clear"
            disabled={!currentMessage.trim() || isStreaming}
            class="send-button"
          >
            <ion-icon
              name={isStreaming ? "hourglass-outline" : "send"}
              slot="icon-only"
            ></ion-icon>
          </ion-button>
        </ion-item>
      </div>
    </ion-toolbar>
  </ion-footer>
{/if}

<style lang="scss">
  // Loading and Error States
  .loading-container,
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    text-align: center;

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin-top: 16px;
    }
  }

  .error-card {
    max-width: 500px;
    width: 100%;

    ion-card-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-top: 16px;

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }

  // Chat Container
  .chat-container {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 120px; // Space for fixed input
  }

  // Documentation Shortcut Card
  .docs-shortcut-card {
    margin-bottom: 24px;
    --background: linear-gradient(
      135deg,
      var(--ion-color-primary-tint),
      var(--ion-color-secondary-tint)
    );
    border: none;
  }

  .docs-shortcut {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    @media (max-width: 600px) {
      flex-direction: column;
      align-items: stretch;
      text-align: center;
    }
  }

  .docs-info {
    display: flex;
    align-items: center;
    gap: 16px;
    flex: 1;

    @media (max-width: 600px) {
      flex-direction: column;
      gap: 8px;
    }

    .docs-icon {
      font-size: 2rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    h4 {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin: 0 0 4px 0;
    }

    p {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      margin: 0;
    }
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

  // Message Wrappers
  .message-wrapper {
    display: flex;
    width: 100%;

    &.user-message {
      justify-content: flex-end;

      .message-bubble {
        max-width: 75%;
        background: var(--ion-color-primary);
        color: var(--ion-color-primary-contrast);
        margin-left: auto;
        border-radius: 18px 18px 4px 18px;

        .message-sender span {
          color: var(--ion-color-primary-contrast);
        }

        .timestamp {
          color: var(--ion-color-primary-contrast);
          opacity: 0.8;
        }

        ion-icon {
          color: var(--ion-color-primary-contrast);
        }
      }
    }

    &.ai-message {
      justify-content: flex-start;

      .message-bubble {
        max-width: 85%;
        background: var(--ion-color-light);
        color: var(--ion-color-dark);
        margin-right: auto;
        border-radius: 18px 18px 18px 4px;
        border: 1px solid var(--ion-color-medium-tint);

        &.streaming {
          background: var(--ion-color-light-tint);
        }
      }
    }
  }

  // Message Bubbles
  .message-bubble {
    padding: 12px 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.2s ease;

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 0.85rem;
  }

  .message-sender {
    display: flex;
    align-items: center;
    gap: 6px;

    ion-icon {
      font-size: 1rem;
    }

    .sender-name {
      font-weight: 600;
    }
  }

  .message-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .timestamp {
    font-size: 0.75rem;
    color: var(--ion-color-medium);
  }

  .message-content {
    line-height: 1.5;
    word-wrap: break-word;

    :global(a) {
      color: var(--ion-color-primary);
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }

    :global(code) {
      background: var(--ion-color-medium-tint);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "Courier New", monospace;
      font-size: 0.9em;
    }

    :global(strong) {
      font-weight: 600;
    }

    :global(em) {
      font-style: italic;
    }
  }

  // Typing Indicator
  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;

    span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ion-color-medium);
      animation: typing 1.4s infinite ease-in-out;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }
      &:nth-child(2) {
        animation-delay: -0.16s;
      }
      &:nth-child(3) {
        animation-delay: 0s;
      }
    }
  }

  @keyframes typing {
    0%,
    80%,
    100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  // Input Area
  .input-container {
    width: 100%;
    padding: 8px 16px;
    background: var(--ion-color-light-tint);
  }

  .message-input-item {
    --background: white;
    --border-radius: 24px;
    --padding-start: 16px;
    --padding-end: 8px;
    --inner-padding-end: 0;
    border: 1px solid var(--ion-color-medium-tint);
    border-radius: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:focus-within {
      border-color: var(--ion-color-primary);
      box-shadow: 0 2px 12px rgba(var(--ion-color-primary-rgb), 0.3);
    }
  }

  .message-input {
    --padding-top: 12px;
    --padding-bottom: 12px;
    font-size: 1rem;
  }

  .send-button {
    --color: var(--ion-color-primary);
    --border-radius: 50%;
    width: 40px;
    height: 40px;
    margin: 4px;

    &:hover:not(:disabled) {
      --background: var(--ion-color-primary-tint);
    }

    &:disabled {
      --color: var(--ion-color-medium);
    }
  }

  // Footer
  ion-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    --background: var(--ion-color-light-tint);
    border-top: 1px solid var(--ion-color-light);
  }

  // Mobile Responsiveness
  @media (max-width: 768px) {
    .chat-container {
      padding-bottom: 140px;
    }

    .message-wrapper {
      &.user-message .message-bubble {
        max-width: 85%;
      }

      &.ai-message .message-bubble {
        max-width: 90%;
      }
    }

    .message-bubble {
      padding: 10px 12px;
    }

    .input-container {
      padding: 12px;
    }

    .message-input {
      font-size: 16px; // Prevents zoom on iOS
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
