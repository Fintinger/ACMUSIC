<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <div class="es-icon">
      <BaseIcon :name="icon" :size="compact ? 24 : 36"/>
    </div>
    <p class="es-title">{{ title }}</p>
    <p v-if="desc" class="es-desc">{{ desc }}</p>
    <button
        v-if="actionText"
        type="button"
        class="es-action"
        @click="$emit('action')"
    >{{ actionText }}</button>
  </div>
</template>

<script>
/**
 * 空态 / 错误态统一组件
 *
 * 用途：列表无数据、接口失败、未登录等场景，替代「一行灰色小字」。
 * 结构：圆形图标底 + 主说明 + 可选副说明 + 可选操作按钮。
 *
 * 用法：
 *   <EmptyState title="今天还没有推荐" desc="登录后每天 6:00 生成" />
 *   <EmptyState icon="disc" :title="error" action-text="重新加载" @action="reload" />
 */
export default {
  name: "EmptyState",
  props: {
    /** 图标名（config/icon.js 注册的任意 name） */
    icon: { type: String, default: "disc" },
    title: { type: String, required: true },
    desc: { type: String, default: "" },
    compact: { type: Boolean, default: false },
    /** 传了才渲染操作按钮 */
    actionText: { type: String, default: "" }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $sp-6 $sp-4;
  text-align: center;

  &.empty-state--compact {
    padding: $sp-5 $sp-3;
    .es-icon { width: 40px; height: 40px; }
    .es-title { font-size: $fs-body; font-weight: 500; }
  }

  .es-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--c-bg-sunken);
    color: $font-black-2;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $sp-3;
  }

  .es-title {
    font-size: 15px;
    font-weight: 700;
    color: $font-black;
    margin: 0;
    line-height: 1.5;
  }

  .es-desc {
    font-size: 13px;
    color: $font-black-2;
    margin: 6px 0 0;
    line-height: 1.6;
    max-width: 340px;
  }

  .es-action {
    margin-top: $sp-4;
    height: 34px;
    padding: 0 20px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: $font-black-1;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: border-color .2s, color .2s;

    &:hover {
      border-color: $color-main;
      color: $color-main-text;
    }
  }
}
</style>
