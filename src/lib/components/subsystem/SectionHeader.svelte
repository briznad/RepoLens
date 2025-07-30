<script lang="ts">
  interface Props {
    title: string;
    icon?: string;
    subtitle?: string;
  }

  let { title, icon, subtitle }: Props = $props();
</script>

<header>
  <h2>
    {#if icon}
      <ion-icon {icon}></ion-icon>
    {/if}

    {title}
  </h2>

  {#if subtitle}
    <p class="subtitle">
      {subtitle}
    </p>
  {/if}
</header>

<style lang="scss">
  header {
    margin-top: 16px;
    margin-bottom: 16px;

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 2rem;
      color: var(--ion-color-dark);
      margin: 0 0 8px 0;
      font-weight: 700;

      @media (max-width: 768px) {
        font-size: 1.5rem;
      }
    }

    .subtitle {
      color: var(--ion-color-medium);
      font-size: 1rem;
      margin: 0;
      font-style: italic;
    }
  }
</style>
