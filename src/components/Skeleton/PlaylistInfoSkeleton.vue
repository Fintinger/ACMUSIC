<template>
  <div class="info-skeleton">
    <div class="skel-cover skeleton-item"></div>
    <div class="skel-detail">
      <div class="skel-line skel-line--title skeleton-item"></div>
      <div class="skel-line skel-line--creator skeleton-item"></div>
      <div class="skel-line skel-line--meta skeleton-item"></div>
      <div class="skel-line skel-line--desc skeleton-item"></div>
      <div class="skel-line skel-line--desc2 skeleton-item"></div>
    </div>
  </div>
</template>

<script>
export default { name: "PlaylistInfoSkeleton" }
</script>

<style lang="scss" scoped>
.info-skeleton {
  display: flex;
  gap: 28px;
  padding: 24px 0;
}

.skel-cover {
  flex-shrink: 0;
  width: 200px;
  height: 200px;
  border-radius: 16px;
}

.skel-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 8px;
}

.skel-line {
  height: 14px;
  border-radius: 8px;

  &--title { width: 60%; height: 22px; }
  &--creator { width: 30%; }
  &--meta { width: 40%; }
  &--desc { width: 90%; }
  &--desc2 { width: 70%; }
}
</style>
