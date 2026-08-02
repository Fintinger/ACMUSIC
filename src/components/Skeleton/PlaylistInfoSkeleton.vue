<template>
  <div class="info-skeleton">
    <div class="skel-cover"></div>
    <div class="skel-detail">
      <div class="skel-line skel-line--title"></div>
      <div class="skel-line skel-line--creator"></div>
      <div class="skel-line skel-line--meta"></div>
      <div class="skel-line skel-line--desc"></div>
      <div class="skel-line skel-line--desc2"></div>
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
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
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
  background: linear-gradient(90deg, #f0f0f0 25%, #e6e6e6 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  &--title { width: 60%; height: 22px; }
  &--creator { width: 30%; }
  &--meta { width: 40%; }
  &--desc { width: 90%; }
  &--desc2 { width: 70%; }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
