<script lang="ts">
  import { sparklesOutline } from 'ionicons/icons';

  interface Props {
    senderName?: string;
  }

  let { senderName = "Iris" }: Props = $props();
</script>

<div class="message-wrapper ai-message">
  <div class="message-bubble streaming">
    <div class="message-header">
      <div class="message-sender">
        <ion-icon icon={sparklesOutline}></ion-icon>
        <span class="sender-name">{senderName}</span>
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

<style lang="scss">
  .message-wrapper {
    display: flex;
    width: 100%;
    justify-content: flex-start;

    .message-bubble {
      max-width: 85%;
      background: var(--ion-color-light);
      color: var(--ion-color-dark);
      margin-right: auto;
      border-radius: 18px 18px 18px 4px;
      border: 1px solid var(--ion-color-medium-tint);
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      &.streaming {
        background: var(--ion-color-light-tint);
      }
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

  .message-content {
    line-height: 1.5;
    word-wrap: break-word;
  }

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

  // Mobile Responsiveness
  @media (max-width: 768px) {
    .message-wrapper .message-bubble {
      max-width: 90%;
      padding: 10px 12px;
    }
  }
</style>