<script lang="ts">
  interface Props {
    message?: string;
    size?: 'small' | 'medium' | 'large';
  }

  let { message = 'Loading...', size = 'medium' }: Props = $props();

  const containerClasses = {
    small: 'loading-container-small',
    medium: 'loading-container-medium', 
    large: 'loading-container-large'
  };
</script>

<div class="loading-container {containerClasses[size]}">
  <ion-spinner name="dots"></ion-spinner>
  <p>{message}</p>
</div>

<style lang="scss">
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;

    ion-spinner {
      margin-bottom: 16px;
    }

    p {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin: 0;
    }
  }

  .loading-container-small {
    min-height: 100px;
    
    p {
      font-size: 0.9rem;
    }
  }

  .loading-container-medium {
    min-height: 200px;
  }

  .loading-container-large {
    min-height: 400px;
    
    p {
      font-size: 1.1rem;
    }
  }
</style>