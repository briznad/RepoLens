<script lang="ts" module>
  import type { OnNavigate } from "@sveltejs/kit";

  import { onNavigate } from "$app/navigation";
</script>

<script lang="ts">
  function determineTransitionClass({ type, delta = 0 }: OnNavigate): string {
    return type === "popstate" && delta < 0 ? "back" : "forward";
  }

  onNavigate((navigation: OnNavigate) => {
    if (!document?.startViewTransition) {
      return;
    }

    document.documentElement.dataset.transition =
      determineTransitionClass(navigation);

    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();

        await navigation.complete;
      });
    });
  });
</script>

<style lang="scss">
  @keyframes slide-from-right {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slide-to-left {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-100%);
    }
  }

  @keyframes slide-from-left {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  @keyframes slide-to-right {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(100%);
    }
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    :root {
      &::view-transition-old(root) {
        animation:
          300ms cubic-bezier(0.4, 0, 0.2, 1) slide-to-left,
          300ms cubic-bezier(0.4, 0, 0.2, 1) fade-out;
      }

      &::view-transition-new(root) {
        animation:
          300ms cubic-bezier(0.4, 0, 0.2, 1) slide-from-right,
          300ms cubic-bezier(0.4, 0, 0.2, 1) fade-in;
      }
    }

    /*
      use :global to bypass Svelte's unused selector protection from stripping
      [data-transition="…"] selector that is dynamically applied and can't be
      detected at compile time
      https://svelte.dev/docs/svelte/compiler-warnings#css_unused_selector
    */
    :global {
      :root {
        &[data-transition="back"] {
          &::view-transition-old(root) {
            animation:
              300ms cubic-bezier(0.4, 0, 0.2, 1) slide-to-right,
              300ms cubic-bezier(0.4, 0, 0.2, 1) fade-out;
          }

          &::view-transition-new(root) {
            animation:
              300ms cubic-bezier(0.4, 0, 0.2, 1) slide-from-left,
              300ms cubic-bezier(0.4, 0, 0.2, 1) fade-in;
          }
        }

        &.ios {
          &::view-transition-old(root) {
            animation: 300ms cubic-bezier(0.32, 0.72, 0, 1) slide-to-left;
          }

          &::view-transition-new(root) {
            animation: 300ms cubic-bezier(0.32, 0.72, 0, 1) slide-from-right;
          }

          &[data-transition="back"] {
            &::view-transition-old(root) {
              animation: 300ms cubic-bezier(0.32, 0.72, 0, 1) slide-to-right;
            }

            &::view-transition-new(root) {
              animation: 300ms cubic-bezier(0.32, 0.72, 0, 1) slide-from-left;
            }
          }
        }
      }
    }
  }
</style>
