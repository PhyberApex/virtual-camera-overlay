<template>
  <div class="camera-layer">
    <video
      v-if="showVideo"
      ref="videoEl"
      class="camera-video"
      :class="{ mirrored: mirror }"
      :src="source === 'sample' ? SAMPLE_VIDEO_URL : undefined"
      autoplay
      muted
      playsinline
      :loop="source === 'sample'"
      @error="onVideoError"
    />
    <div v-if="showPlaceholder" class="camera-placeholder" role="status">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { SAMPLE_VIDEO_URL, useCamera } from '../composables/useCamera';

defineProps<{ mirror: boolean }>();

const { stream, status, source, setSampleMissing } = useCamera();
const videoEl = ref<HTMLVideoElement | null>(null);

const showVideo = computed(() => source.value === 'sample' || status.value === 'live');
const showPlaceholder = computed(
  () => source.value === 'webcam' && ['denied', 'unavailable', 'ended'].includes(status.value)
);
const message = computed(() => {
  switch (status.value) {
    case 'denied':
      return 'Camera access denied';
    case 'ended':
      return 'Camera disconnected, reconnecting…';
    default:
      return 'No camera found';
  }
});

watch(
  [stream, videoEl, source],
  () => {
    if (videoEl.value) {
      videoEl.value.srcObject = source.value === 'webcam' ? stream.value : null;
    }
  },
  { flush: 'post', immediate: true }
);

const onVideoError = (): void => {
  if (source.value === 'sample') setSampleMissing(true);
};
</script>

<style scoped>
.camera-layer {
  position: absolute;
  inset: 0;
  background-color: #111111;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-video.mirrored {
  transform: scaleX(-1);
}

.camera-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #1a1a1a;
  color: #cccccc;
  font-size: 2.5rem;
}
</style>
