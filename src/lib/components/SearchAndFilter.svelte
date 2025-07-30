<script lang="ts">
  import { star } from "ionicons/icons";

  interface FilterOption {
    value: string;
    label: string;
  }

  interface Props {
    searchQuery: string;
    searchPlaceholder?: string;
    sortBy?: string;
    sortOptions?: FilterOption[];
    onSearchChange: (query: string) => void;
    onSortChange?: (sortBy: string) => void;
  }

  let {
    searchQuery,
    searchPlaceholder = "Search...",
    sortBy,
    sortOptions = [],
    onSearchChange,
    onSortChange,
  }: Props = $props();

  function handleSearchInput(e: any) {
    onSearchChange(e.detail.value);
  }

  function handleSortChange(e: any) {
    if (onSortChange) {
      onSortChange(e.detail.value);
    }
  }
</script>

<ion-card>
  <ion-card-content>
    <ion-searchbar
      slot="start"
      placeholder={searchPlaceholder}
      value={searchQuery}
      onionInput={handleSearchInput}
      show-clear-button="focus"
    ></ion-searchbar>

    {#if sortOptions.length > 0 && onSortChange}
      <ion-select
        slot="end"
        placeholder="Sort by"
        value={sortBy}
        onionSelectionChange={handleSortChange}
      >
        {#each sortOptions as option}
          <ion-select-option value={option.value}>
            {option.label}
          </ion-select-option>
        {/each}
      </ion-select>
    {/if}
  </ion-card-content>
</ion-card>

<style lang="scss">
  ion-card {
    margin-bottom: 0;
  }

  ion-card-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  ion-searchbar {
    padding-left: 0;
  }
</style>
