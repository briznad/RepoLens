<script lang="ts" module>
  import { parseDate } from "briznads-helpers";

  interface Props {
    createdAt: string;
    updatedAt?: string;
  }
</script>

<script lang="ts">
  let { createdAt, updatedAt }: Props = $props();

  let isUpdated = $derived(updatedAt && updatedAt !== createdAt);

  let dateObject = $derived(
    parseDate(updatedAt && isUpdated ? updatedAt : createdAt)
  );
</script>

{isUpdated ? "upd" : "cre"}ated {dateObject.toLocaleString(undefined, {
  dateStyle: "short",
  timeStyle: "short",
})}

<style></style>
