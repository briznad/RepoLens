<script lang="ts">
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
    searchPlaceholder = 'Search...', 
    sortBy,
    sortOptions = [],
    onSearchChange,
    onSortChange
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

<ion-card class="filter-card">
  <ion-card-content>
    <div class="filter-section">
      <ion-searchbar
        placeholder={searchPlaceholder}
        value={searchQuery}
        onionInput={handleSearchInput}
        show-clear-button="focus"
      ></ion-searchbar>
      
      {#if sortOptions.length > 0 && onSortChange}
        <div class="filter-controls">
          <ion-select
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
        </div>
      {/if}
    </div>
  </ion-card-content>
</ion-card>

<style lang="scss">
  .filter-card {
    margin-bottom: 24px;
  }

  .filter-section {
    display: flex;
    gap: 16px;
    align-items: center;
    
    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  .filter-controls {
    display: flex;
    gap: 12px;
    min-width: 200px;
  }
</style>