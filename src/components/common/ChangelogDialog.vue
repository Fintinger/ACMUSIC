<template>
  <el-dialog
      :visible="visible"
      title="更新日志"
      width="580px"
      append-to-body
      @update:visible="$emit('update:visible', $event)"
  >
    <div class="cl-body">
      <section v-for="log in logs" :key="log.version" class="cl-entry">
        <header class="cl-head">
          <span class="cl-ver">v{{ log.version }}</span>
          <span v-if="log.version === currentVersion" class="cl-now">当前版本</span>
          <time class="cl-date">{{ log.date }}</time>
        </header>

        <div v-for="sec in log.sections" :key="sec.title" class="cl-sec">
          <p class="cl-sec-title">{{ sec.title }}</p>
          <ul class="cl-list">
            <li v-for="(item, idx) in sec.items" :key="idx">{{ item }}</li>
          </ul>
        </div>
      </section>
    </div>

    <span slot="footer" class="cl-footer">
      <a class="cl-link" :href="fullLogUrl" target="_blank" rel="noopener noreferrer">在 GitHub 查看完整日志</a>
      <el-button size="small" type="primary" @click="$emit('update:visible', false)">知道了</el-button>
    </span>
  </el-dialog>
</template>

<script>
import config from '@/config'
import logs from '@/data/changelog.generated'

export default {
  name: 'ChangelogDialog',
  props: {
    visible: { type: Boolean, default: false }
  },
  data() {
    return { logs }
  },
  computed: {
    // 跟 package.json 对齐；日志里没有这个版本号时不打"当前版本"标（提醒发版时补日志）
    currentVersion() {
      return (config.site && config.site.version) || ''
    },
    fullLogUrl() {
      const repo = (config.site && config.site.repo) || ''
      return repo ? `${repo}/blob/master/CHANGELOG.md` : ''
    }
  }
}
</script>

<style lang="scss" scoped>
// 只用主题 CSS 变量，不引 scss 变量，避免这层多一次 sass 依赖
.cl-body {
  // 版本多了以后弹窗不能无限长：滚动区固定上限，标题/页脚始终可见
  max-height: 56vh;
  overflow-y: auto;
  padding-right: 4px;
  margin-right: -4px;

  // 滚动条与全站一致（reset.scss 里 html/body 那套）：5px 细条 + 语义 token，
  // 不写死颜色，深色下自动换成白色滑块
  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    border-radius: 5px;
    background: var(--c-bg-hover);
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 5px;
    background: var(--c-scroll-thumb);

    &:hover { background: var(--c-text-tertiary); }
  }
}

.cl-entry {
  & + .cl-entry {
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px dashed var(--c-border-strong);
  }
}

.cl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;

  .cl-ver {
    font-size: 16px;
    font-weight: 700;
    letter-spacing: .3px;
    color: var(--c-text-primary);
  }

  .cl-now {
    font-size: 10px;
    font-weight: 600;
    line-height: 16px;
    padding: 0 6px;
    border-radius: 4px;
    color: var(--c-accent);
    background: rgba(var(--theme-accent-rgb), .12);
    border: 1px solid rgba(var(--theme-accent-rgb), .28);
  }

  .cl-date {
    margin-left: auto;
    font-size: 12px;
    color: var(--c-text-tertiary);
    font-variant-numeric: tabular-nums;
  }
}

.cl-sec + .cl-sec { margin-top: 12px; }

.cl-sec-title {
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: .5px;
  color: var(--c-text-secondary);

  &::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    margin-right: 7px;
    vertical-align: 2px;
    background: var(--c-accent);
  }
}

.cl-list {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    position: relative;
    padding-left: 16px;
    font-size: 13px;
    line-height: 1.75;
    color: var(--c-text-secondary);

    &::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 10px;
      width: 4px;
      height: 1px;
      background: var(--c-text-tertiary);
    }
  }
}

.cl-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  .cl-link {
    font-size: 12px;
    color: var(--c-text-tertiary);
    text-decoration: none;
    transition: color .18s;

    &:hover { color: var(--c-accent); }
  }
}
</style>
