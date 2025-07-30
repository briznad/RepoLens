<script lang="ts">
  import { hourglassOutline, send } from "ionicons/icons";

  interface Props {
    currentMessage: string;
    isStreaming: boolean;
    placeholder?: string;
    onMessageChange: (message: string) => void;
    onSendMessage: () => void;
    onKeyPress: (event: KeyboardEvent) => void;
  }

  let {
    currentMessage,
    isStreaming,
    placeholder = "Ask Iris about the repository...",
    onMessageChange,
    onSendMessage,
    onKeyPress,
  }: Props = $props();

  let messageInput: HTMLIonTextareaElement;

  function handleInput(e: any) {
    onMessageChange(e.detail.value);
  }
</script>

<ion-footer>
  <ion-toolbar>
    <div class="input-container">
      <ion-item class="message-input-item">
        <ion-textarea
          {placeholder}
          value={currentMessage}
          onionInput={handleInput}
          onkeydown={onKeyPress}
          rows={1}
          auto-grow={true}
          class="message-input"
          bind:this={messageInput}
        ></ion-textarea>
        <ion-button
          slot="end"
          onclick={onSendMessage}
          fill="clear"
          disabled={!currentMessage.trim() || isStreaming}
          class="send-button"
        >
          <ion-icon
            icon={isStreaming ? hourglassOutline : send}
            slot="icon-only"
          ></ion-icon>
        </ion-button>
      </ion-item>
    </div>
  </ion-toolbar>
</ion-footer>

<style lang="scss">
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
    .input-container {
      padding: 12px;
    }

    .message-input {
      font-size: 16px; // Prevents zoom on iOS
    }
  }
</style>
