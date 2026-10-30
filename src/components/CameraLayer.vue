<template>
  <div class="camera-layer" :class="{ blurred }">
    <div v-if="showVideo" ref="frameEl" class="camera-frame">
      <video
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
    </div>
    <div v-if="showPlaceholder" class="camera-placeholder" role="status">
      {{ message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import gsap from 'gsap';
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue';
import { SAMPLE_VIDEO_URL, useCamera } from '../composables/useCamera';
import { useFaceTracking } from '../composables/useFaceTracking';
import {
  computeFraming,
  DEFAULT_FRAMING_CONFIG,
  IDENTITY_FRAMING,
  type Framing,
  type FramingConfig,
} from '../utils/framing';
import { STAGE_SIZE } from '../utils/widgetLayout';

const props = withDefaults(
  defineProps<{ mirror: boolean; framing?: FramingConfig; blurred?: boolean }>(),
  {
    blurred: false,
    framing: () => ({ ...DEFAULT_FRAMING_CONFIG }),
  }
);

const { stream, status, source, setSampleMissing } = useCamera();
const videoEl = ref<HTMLVideoElement | null>(null);
const frameEl = ref<HTMLDivElement | null>(null);

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

// Face tracking is pointless while the placeholder covers the stage.
const { faceBox, tracked } = useFaceTracking({
  video: videoEl,
  enabled: computed(() => showVideo.value && !showPlaceholder.value),
  mirror: toRef(props, 'mirror'),
});

let target: Framing = IDENTITY_FRAMING;

const easeTo = (next: Framing, immediate = false): void => {
  target = next;
  if (!frameEl.value) return;
  const vars = { x: next.x, y: next.y, scale: next.scale };
  if (immediate) {
    gsap.killTweensOf(frameEl.value);
    gsap.set(frameEl.value, vars);
    return;
  }
  gsap.to(frameEl.value, {
    ...vars,
    duration: props.framing.easeMs / 1000,
    ease: 'power2.out',
    overwrite: true,
  });
};

watch([faceBox, tracked], () => {
  if (tracked.value && faceBox.value) {
    const next = computeFraming(faceBox.value, STAGE_SIZE, props.framing, target);
    if (next !== target) easeTo(next);
  } else if (target !== IDENTITY_FRAMING) {
    easeTo(IDENTITY_FRAMING);
  }
});

// The frame element is recreated with the video, so start it from the full frame.
watch(frameEl, () => easeTo(IDENTITY_FRAMING, true));

onBeforeUnmount(() => {
  if (frameEl.value) gsap.killTweensOf(frameEl.value);
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
  transition:
    filter 0.4s ease,
    transform 0.4s ease;
}

/* Scaled up slightly so the blur's soft edges stay outside the stage. */
.camera-layer.blurred {
  filter: blur(40px);
  transform: scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .camera-layer {
    transition: none;
  }
}

.camera-frame {
  position: absolute;
  inset: 0;
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
