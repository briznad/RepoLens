<script lang="ts" module>
  import type { Color } from "$types/color";
  import type { Fill, Expand, Type, Size, Target } from "$types/button";

  import { HEK } from "$utilities/helper";

  interface Props {
    text?: string;
    id?: string;
    color?: Color;
    disabled?: boolean;
    triggered?: () => void | Promise<void>;
    additionalClass?: string;
    fill?: Fill;
    expand?: Expand;
    ariaLabel?: string;
    icon?: string;
    iconSlot?: "icon-only" | "start" | "end";
    iconSize?: Size;
    strong?: boolean;
    type?: Type;
    size?: Size;
    target?: Target;
    href?: string;
    rel?: "noopener noreferrer";
    style?: string;
    iconStyle?: string;
    capitalize?: boolean;
  }
</script>

<script lang="ts">
  let {
    text,
    id,
    color,
    disabled,
    triggered = () => {},
    additionalClass,
    fill,
    expand,
    ariaLabel,
    icon,
    iconSlot = "start",
    iconSize,
    strong,
    type = "button",
    size,
    target,
    href,
    rel,
    style,
    iconStyle,
    capitalize,
  }: Props = $props();
</script>

<ion-button
  {id}
  class={additionalClass}
  class:capitalize
  {fill}
  {expand}
  {disabled}
  onclick={triggered}
  onkeydown={HEK(triggered)}
  role="button"
  tabindex="0"
  aria-label={ariaLabel}
  {color}
  {strong}
  {type}
  {size}
  {target}
  {href}
  {rel}
  {style}
>
  {#if icon}
    <ion-icon
      slot={!text ? "icon-only" : iconSlot}
      {icon}
      style={iconStyle}
      size={iconSize}
    ></ion-icon>
  {/if}

  {#if text}
    {text}
  {/if}
</ion-button>

<style lang="scss">
  .capitalize {
    text-transform: capitalize;
  }
</style>
