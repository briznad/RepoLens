<script lang="ts">
  import { page } from '$app/stores';
  
  const repoId = $derived($page.params.id);
  
  let messages = $state<Array<{id: number, text: string, isUser: boolean, timestamp: Date}>>([
    {
      id: 1,
      text: "Hello! I'm your RepoLens AI assistant. I've analyzed this repository and I'm ready to help you understand its structure, code patterns, and documentation. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  
  let currentMessage = $state('');
  
  const sendMessage = () => {
    if (currentMessage.trim()) {
      // Add user message
      messages = [...messages, {
        id: messages.length + 1,
        text: currentMessage,
        isUser: true,
        timestamp: new Date()
      }];
      
      const userMessage = currentMessage;
      currentMessage = '';
      
      // Simulate AI response
      setTimeout(() => {
        messages = [...messages, {
          id: messages.length + 1,
          text: `I understand you're asking about: "${userMessage}". This is a placeholder response. In the full implementation, I would analyze the repository and provide specific insights about the codebase.`,
          isUser: false,
          timestamp: new Date()
        }];
      }, 1000);
    }
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
</script>

<ion-content class="ion-padding">
  <div class="chat-container">
    <!-- Welcome Card -->
    <ion-card class="welcome-card">
      <ion-card-header>
        <ion-card-title>Repository Chat</ion-card-title>
        <ion-card-subtitle>Ask me anything about this repository</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <p>I can help you understand:</p>
        <ul>
          <li>Code architecture and patterns</li>
          <li>File structure and organization</li>
          <li>Dependencies and relationships</li>
          <li>Documentation and README files</li>
        </ul>
      </ion-card-content>
    </ion-card>
    
    <!-- Chat Messages -->
    <div class="messages-container">
      {#each messages as message}
        <div class="message-wrapper {message.isUser ? 'user-message' : 'ai-message'}">
          <ion-card class="message-card">
            <div class="message-header">
              <ion-chip color={message.isUser ? 'primary' : 'secondary'}>
                <ion-icon name={message.isUser ? 'person' : 'sparkles'}></ion-icon>
                <ion-label>{message.isUser ? 'You' : 'RepoLens AI'}</ion-label>
              </ion-chip>
              <span class="timestamp">{formatTime(message.timestamp)}</span>
            </div>
            <ion-card-content>
              <p>{message.text}</p>
            </ion-card-content>
          </ion-card>
        </div>
      {/each}
    </div>
  </div>
</ion-content>

<!-- Fixed Input Area -->
<ion-footer>
  <ion-toolbar>
    <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="message-form">
      <ion-item>
        <ion-input
          placeholder="Ask about the repository..."
          value={currentMessage}
          onionInput={(e: any) => currentMessage = e.detail.value}
          class="message-input"
        ></ion-input>
        <ion-button 
          slot="end" 
          type="submit" 
          fill="clear"
          disabled={!currentMessage.trim()}
        >
          <ion-icon name="send" slot="icon-only"></ion-icon>
        </ion-button>
      </ion-item>
    </form>
  </ion-toolbar>
</ion-footer>

<style lang="scss">
  .chat-container {
    max-width: 800px;
    margin: 0 auto;
    padding-bottom: 100px; // Space for fixed input
  }

  .welcome-card {
    margin-bottom: 20px;
  }

  .welcome-card ul {
    margin: 10px 0;
    padding-left: 20px;
  }

  .messages-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .message-wrapper {
    display: flex;
    width: 100%;
    
    &.user-message {
      justify-content: flex-end;
      
      .message-card {
        max-width: 70%;
        margin-left: auto;
      }
    }
    
    &.ai-message {
      justify-content: flex-start;
      
      .message-card {
        max-width: 85%;
        margin-right: auto;
      }
    }
  }

  .message-card {
    margin: 0;
  }

  .message-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px 0 16px;
  }

  .timestamp {
    font-size: 0.8rem;
    color: var(--ion-color-medium);
  }

  .message-form {
    width: 100%;
  }

  .message-input {
    flex: 1;
  }

  ion-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 10;
  }
</style>