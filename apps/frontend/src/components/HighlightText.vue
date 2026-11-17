<script setup lang="ts">
import { computed } from 'vue'

import { highlightParts } from '../utils/search.ts'

const props = defineProps<{ text: string; query?: string }>()
const parts = computed(() => highlightParts(props.text, props.query ?? ''))
</script>

<template>
  <template v-for="(p, i) in parts" :key="i"
    ><mark v-if="p.hit" class="mm-mark">{{ p.text }}</mark
    ><template v-else>{{ p.text }}</template></template
  >
</template>
