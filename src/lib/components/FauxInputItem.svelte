<script lang="ts" module>
  import type { Snippet } from "svelte";

  interface Props {
    key: string;
    value: string | number | Snippet;
    allowWordWrap?: boolean;
    lineHeight?: number;
  }
</script>

<script lang="ts">
  let { key, value, allowWordWrap = false, lineHeight }: Props = $props();
</script>

<div class="fake-input" style:line-height={lineHeight}>
  <div class="key">{key}</div>

  <div class="value" class:no-wrap={!allowWordWrap}>
    {#if typeof value === "function"}
      {@render value()}
    {:else}
      {value}
    {/if}
  </div>
</div>

<style lang="scss">
  .key {
    margin-bottom: 5px;
    font-size: 12px;
    text-transform: capitalize;
  }

  .value {
    &.no-wrap {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
