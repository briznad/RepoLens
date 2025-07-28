<script lang="ts" module>
  import type { Snippet } from "svelte";

  interface Props {
    children: Snippet;
    allcaps?: boolean;
    title?: undefined | string;
    inline?: boolean;
    center?: boolean;
  }
</script>

<script lang="ts">
  let {
    children,
    allcaps = true,
    title = undefined,
    inline = false,
    center = false,
  }: Props = $props();
</script>

<span
  class="chunky-label"
  class:mixed-case={!allcaps}
  class:inline
  class:center
  {title}
>
  {@render children()}
</span>

<style lang="scss">
  .chunky-label {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
    color: #666;
    text-transform: uppercase;

    &.mixed-case {
      text-transform: none;
    }

    &.inline {
      display: inline;
    }

    &.center {
      justify-content: center;
    }
  }
</style>
