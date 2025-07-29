<script lang="ts">
  import { layersOutline } from 'ionicons/icons';
  import type { Subsystem } from '$types/analysis';

  interface Props {
    subsystems: Subsystem[];
    onSubsystemClick: (subsystemName: string) => void;
    isCurrentSubsystem: (subsystemName: string) => boolean;
  }

  let { subsystems, onSubsystemClick, isCurrentSubsystem }: Props = $props();
</script>

<div class="subsystems-menu">
  {#each subsystems as subsystem}
    <ion-item
      button
      class="subsystem-item"
      class:selected={isCurrentSubsystem(subsystem.name)}
      onclick={() => onSubsystemClick(subsystem.name)}
    >
      <ion-icon icon={layersOutline} slot="start"></ion-icon>
      <ion-label>
        <div class="subsystem-name">{subsystem.name}</div>
        <div class="subsystem-info">
          {subsystem.files.length} files
        </div>
      </ion-label>
    </ion-item>
  {/each}
</div>

<style lang="scss">
  .subsystems-menu {
    background: var(--ion-color-light-shade);
    border-radius: 8px;
    margin: 8px 16px 0 16px;
    overflow: hidden;
  }

  .subsystem-item {
    --padding-start: 20px;
    --padding-end: 16px;
    --background: transparent;
    font-size: 0.9rem;
    border-bottom: 1px solid var(--ion-color-light);

    &:last-child {
      border-bottom: none;
    }

    &.selected {
      --background: var(--ion-color-primary-tint);
      --color: var(--ion-color-primary);
      font-weight: 600;
    }

    &:hover:not(.selected) {
      --background: var(--ion-color-light);
    }

    .subsystem-name {
      font-weight: 500;
      line-height: 1.2;
    }

    .subsystem-info {
      font-size: 0.8rem;
      color: var(--ion-color-medium);
      margin-top: 2px;
    }
  }
</style>