<script lang="ts" module>
  import type { Color } from "$types/color";

  import {
    checkmark,
    trashOutline,
    addOutline,
    createOutline,
  } from "ionicons/icons";

  import { HEK } from "$utilities/helper";

  type Props = {
    triggerId?: string;
    triggered?: () => void;
    label: string;
    color?: Color;
    iconColor?: Color;
    showCheckmark?: boolean;
    lines?: undefined | "full" | "none";
    disabled?: boolean;
    capitalize?: boolean;
    allowWordWrap?: boolean;
    icon?: string;
    iconType?: "add" | "edit" | "delete";
    href?: string;
    target?: "_blank" | "_self" | "_parent" | "_top";
  };
</script>

<script lang="ts">
  let {
    label,
    color,
    iconColor,
    showCheckmark = false,
    lines,
    disabled = false,
    triggerId,
    triggered = () => {},
    capitalize = false,
    allowWordWrap = false,
    icon,
    iconType,
    href,
    target,
  }: Props = $props();

  const iconMap = {
    add: addOutline,
    edit: createOutline,
    delete: trashOutline,
  };

  let localIcon: string | undefined = $derived(
    icon ?? (iconType ? iconMap[iconType] : undefined)
  );
</script>

<ion-item
  class="popover-menu-list-item"
  class:no-wrap={!allowWordWrap}
  id={triggerId}
  button={true}
  detail={false}
  {lines}
  {disabled}
  onclick={triggered}
  onkeydown={HEK(triggered)}
  role="button"
  tabindex="0"
  {href}
  {target}
>
  {#if localIcon}
    <ion-icon slot="start" icon={localIcon} color={iconColor ?? color}
    ></ion-icon>
  {/if}

  <ion-label class:capitalize {color}>{label}</ion-label>

  {#if showCheckmark}
    <ion-icon slot="end" icon={checkmark}></ion-icon>
  {/if}
</ion-item>

<style lang="scss">
  ion-item {
    &.no-wrap {
      white-space: nowrap;
    }
  }

  ion-icon {
    &:first-child {
      margin-right: 10px;
    }
  }

  ion-label {
    &.capitalize {
      text-transform: capitalize;
    }
  }
</style>
