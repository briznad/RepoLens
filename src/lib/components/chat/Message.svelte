<script lang="ts">
  import {
    copyOutline,
    sparklesOutline,
    personCircleOutline,
  } from "ionicons/icons";
  import type { ChatMessage as ChatMessageType } from "$types/chat";

  interface Props {
    message: ChatMessageType;
    onCopy: (content: string) => void;
  }

  let { message, onCopy }: Props = $props();

  function formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function processMessageContent(content: string): string {
    return content
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (match, text, url) => {
          // Check if it's an internal link (starts with /repo/)
          if (url.startsWith('/repo/')) {
            return `<a href="${url}">${text}</a>`;
          } else {
            // External link
            return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
          }
        }
      )
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }
</script>

<div
  class="message-wrapper {message.role === 'user'
    ? 'user-message'
    : 'ai-message'}"
>
  <div class="message-bubble">
    <div class="message-header">
      <div class="message-sender">
        <ion-icon
          icon={message.role === "user" ? personCircleOutline : sparklesOutline}
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
          onclick={() => onCopy(message.content)}
          title="Copy message"
        >
          <ion-icon icon={copyOutline} slot="icon-only"></ion-icon>
        </ion-button>
      </div>
    </div>
    <div class="message-content">
      {@html processMessageContent(message.content)}
    </div>
  </div>
</div>

<style lang="scss">
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
      }
    }
  }

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
    padding-left: 0.75em;
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

  // Mobile Responsiveness
  @media (max-width: 768px) {
    .message-wrapper.user-message .message-bubble {
      max-width: 85%;
    }

    .message-wrapper.ai-message .message-bubble {
      max-width: 90%;
    }

    .message-bubble {
      padding: 10px 12px;
    }
  }
</style>
