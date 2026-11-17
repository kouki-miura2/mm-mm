<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 22 })
</script>

<template>
  <span class="mm-logo" :style="{ fontSize: `${size}px` }"
    ><span>Mm</span><span class="text-primary">Mm</span></span
  >
</template>

<style scoped>
.mm-logo {
  font-family: var(--mm-font);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: #1a1d21;
}
</style>
