<template>
  <div class="marquee">
    <div class="marquee-wrap">
      <div class="marquee-content ">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "scoText"
}
</script>

<style scoped lang="scss">
.marquee {
  overflow: hidden;
}

.marquee .marquee-wrap {
  width: 100%;
  animation: marquee-wrap 8s infinite linear;

  &:hover{
    animation-play-state: paused;
  }
}

.marquee .marquee-content {
  float: left;
  white-space: nowrap;
  min-width: 100%;
  animation: marquee-content 8s infinite linear;
  &:hover{
    animation-play-state: paused;
  }
}

@keyframes marquee-wrap {

  0%,
  30% {
    transform: translateX(0);
  }

  70%,
  100% {
    transform: translateX(100%);
  }
}

@keyframes marquee-content {

  0%,
  30% {
    transform: translateX(0);
  }

  70%,
  100% {
    transform: translateX(-100%);
  }
}
</style>