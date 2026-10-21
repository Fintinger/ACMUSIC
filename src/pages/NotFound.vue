<template>
  <div class="not-found">
    <div class="nf-card">
      <p class="nf-code">404</p>
      <h1 class="nf-title">这个页面不在曲库外，是真的找不到</h1>
      <p class="nf-desc">链接可能已经失效，或者地址打错了一个字符。</p>
      <div class="nf-actions">
        <button class="nf-btn primary" @click="goHome">回到首页</button>
        <button class="nf-btn" @click="goBack">返回上一页</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "NotFound",
  methods: {
    goHome() {
      this.$router.push('/')
    },
    goBack() {
      // 直接输错地址进来时没有历史记录，回退会退出站点，这里兜底回首页
      if (window.history.length > 1) {
        this.$router.back()
      } else {
        this.$router.push('/')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.not-found {
  min-height: 62vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
}

.nf-card {
  text-align: center;
  max-width: 520px;
  padding: 48px 40px;
  border-radius: 24px;
  background: rgba(255, 255, 255, .55);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, .45);
  box-shadow: 0 12px 40px rgba(0, 0, 0, .06);
}

.nf-code {
  margin: 0;
  font-size: 72px;
  font-weight: 700;
  line-height: 1;
  color: $color-main;
  letter-spacing: 2px;
}

.nf-title {
  margin: 16px 0 8px;
  font-size: 20px;
  font-weight: 600;
  color: $font-black;
}

.nf-desc {
  margin: 0 0 28px;
  font-size: 14px;
  color: $font-black-2;
}

.nf-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.nf-btn {
  height: 38px;
  padding: 0 24px;
  border-radius: 19px;
  border: 1px solid rgba(0, 0, 0, .1);
  background: transparent;
  font-size: 14px;
  color: $font-black-1;
  cursor: pointer;
  transition: all .2s;

  &:hover {
    border-color: $color-main;
    color: $color-main;
  }

  &.primary {
    background: $color-main;
    border-color: $color-main;
    color: $font-white;

    &:hover {
      background: $color-main-1;
      border-color: $color-main-1;
      color: $font-white;
    }
  }
}
</style>
