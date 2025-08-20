<template>
  <div
    v-if="heartEnabled"
  > Heart Rate{{ heartRate }}
  </div>
</template>

<script setup lang="ts">
import { useHomeAssistant } from '../composables/useHomeAssistant';

const { heartEnabled, heartRate } = useHomeAssistant();

</script>
