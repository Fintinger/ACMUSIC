<template>
  <div class="tracklist-skeleton">
    <div v-for="n in count" :key="n" class="skel-row">
      <div class="skel-cover skeleton-item"></div>
      <div class="skel-info">
        <div class="skel-line skel-line--title skeleton-item"></div>
        <div class="skel-line skel-line--sub skeleton-item"></div>
      </div>
      <div class="skel-line skel-line--album skeleton-item"></div>
      <div class="skel-line skel-line--time skeleton-item"></div>
    </div>
  </div>
</template>

<script>
export default {
  name: "TrackListSkeleton",
  props: { count: { type: Number, default: 10 } }
}
</script>

<style lang="scss" scoped>
.tracklist-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.skel-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(0,0,0,.04);
}

.skel-cover {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 6px;
}

.skel-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skel-line {
  height: 12px;
  border-radius: 6px;

  &--title { width: 55%; }
  &--sub { width: 35%; height: 10px; }
  &--album { width: 80px; }
  &--time { width: 50px; }
}
</style>
