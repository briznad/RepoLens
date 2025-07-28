<script lang="ts" module>
</script>

<script lang="ts">
  import { page } from "$app/state";
</script>

{page.status.toString()}

<ion-content class="ion-padding">
  {page.error?.message}
</ion-content>

<style></style>
