<template>
  <div class="grid-skeleton">
    <div class="skel-section-title" v-if="title"></div>
    <div class="grid-skeleton__grid" :class="'grid-skeleton__grid--' + type">
      <div v-for="n in count" :key="n" class="skel-card" :class="'skel-card--' + type">
        <div class="skel-img"></div>
        <div class="skel-body">
          <div class="skel-line skel-line--title"></div>
          <div class="skel-line skel-line--sub" v-if="type==='rank'"></div>
          <div class="skel-line skel-line--sub" v-if="type!=='artist'&&type!=='rank'"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "GridSkeleton",
  props: {
    count: { type: Number, default: 8 },
    type: { type: String, default: 'playlist' },
    title: { type: Boolean, default: true }
  }
}
</script>

<style lang="scss" scoped>
.grid-skeleton {
  margin-bottom: 40px;
}

.skel-section-title {
  height: 22px;
  width: 100px;
  border-radius: 6px;
  margin-bottom: 18px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.grid-skeleton__grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;

  &--artist {
    grid-template-columns: repeat(5, 1fr);
  }

  &--rank {
    grid-template-columns: repeat(6, 1fr);
  }

  &--mv, &--video {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  }
}

.skel-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(0,0,0,.04);

  &--artist {
    text-align: center;
    border: none;
    background: transparent;
  }
}

.skel-img {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  display: block;

  .skel-card--artist & {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    margin: 12px auto 0;
  }

  .skel-card--rank & {
    aspect-ratio: auto;
    height: 140px;
  }

  .grid-skeleton__grid--mv &,
  .grid-skeleton__grid--video & {
    aspect-ratio: 16 / 9;
  }
}

.skel-body {
  padding: 14px 14px 16px;

  .skel-card--artist & {
    padding: 10px 4px 14px;
  }
}

.skel-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;

  &--title {
    width: 80%;
    margin-bottom: 8px;
  }

  &--sub {
    width: 55%;
    height: 10px;
  }

  .skel-card--artist &--title {
    width: 60%;
    margin: 0 auto;
  }

  .skel-card--rank &--sub {
    width: 65%;
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
