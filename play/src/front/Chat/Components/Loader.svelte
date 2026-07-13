<script lang="ts">
    let { label = "", text = "", className = "" }: { label?: string; text?: string; className?: string } = $props();
</script>

<span class={className}>{label || text}</span>
