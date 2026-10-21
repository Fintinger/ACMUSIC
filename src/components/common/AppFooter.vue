<template>
  <footer class="app-footer">
    <div class="af-left">
      <span class="af-brand">{{ site.name }}</span>
      <span class="af-meta">第三方客户端 · v{{ site.version }}<template v-if="site.commit"> · {{ site.commit }}</template></span>
    </div>

    <nav class="af-links">
      <a :href="site.repo" target="_blank" rel="noopener noreferrer">源码</a>
      <a :href="site.issues" target="_blank" rel="noopener noreferrer">反馈</a>
      <a :href="site.apiRepo" target="_blank" rel="noopener noreferrer">API 仓库</a>
      <a :href="site.apiDocs" target="_blank" rel="noopener noreferrer">API 文档</a>
      <button type="button" class="af-link-btn" @click="showDisclaimer = true">免责声明</button>
    </nav>

    <div class="af-right">© {{ year }} {{ site.name }} · 仅供学习交流</div>

    <el-dialog
        :visible.sync="showDisclaimer"
        title="免责声明"
        width="520px"
        append-to-body
        class="af-dialog"
    >
      <div class="af-disclaimer">
        <p>本站是个人学习项目，<strong>非网易云音乐官方产品</strong>，与网易云音乐及其关联方没有任何关系。</p>
        <p>站内音乐、封面、歌词等内容的版权均归网易云音乐及相应版权方所有。本站不存储任何音频文件，播放地址由上游接口实时返回。</p>
        <p>本站不作商业用途，也不主张对上述内容的任何权利。若版权方认为本站内容侵犯权益，请联系删除，我们会尽快处理。</p>
        <p>
          数据与音频接口来自开源项目
          <a :href="site.apiRepo" target="_blank" rel="noopener noreferrer">{{ repoLabel }}</a>，
          遵循其原始开源许可。
        </p>
        <p>
          本站源码开源在
          <a :href="site.repo" target="_blank" rel="noopener noreferrer">{{ siteName }}</a>，
          问题与建议欢迎在 Issues 反馈。
        </p>
      </div>
      <span slot="footer">
        <el-button size="small" @click="showDisclaimer = false">关闭</el-button>
      </span>
    </el-dialog>
  </footer>
</template>

<script>
import config from "@/config"

export default {
  name: "AppFooter",
  data() {
    return {
      site: config.site,
      showDisclaimer: false,
      year: new Date().getFullYear()
    }
  },
  computed: {
    // 展示用短标签，避免一行里塞完整 URL
    repoLabel() {
      const repo = this.site && this.site.apiRepo
      if (!repo) return 'API 项目'
      const m = repo.match(/github\.com\/([^/]+\/[^/]+)/i)
      return m ? m[1] : 'API 项目'
    },
    siteName() {
      const repo = this.site && this.site.repo
      if (!repo) return 'GitHub'
      const m = repo.match(/github\.com\/([^/]+\/[^/]+)/i)
      return m ? m[1] : 'GitHub'
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 48px;
  /* 避让固定播放条（$bar-h = 60px） */
  padding: 16px 4px calc(60px + 20px);
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 12px;
  color: $font-black-2;
  line-height: 1.8;
}

.af-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;

  .af-brand {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .5px;
    color: $font-black-1;
  }

  .af-meta { opacity: .75; }
}

.af-links {
  display: flex;
  align-items: center;
  gap: 18px;

  a,
  .af-link-btn {
    color: $font-black-2;
    text-decoration: none;
    background: none;
    border: none;
    padding: 0;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: color .18s;

    &:hover { color: $color-main; }
  }
}

.af-right { opacity: .75; }

.af-disclaimer {
  font-size: 13px;
  line-height: 1.9;
  color: $font-black-2;

  p { margin: 0 0 10px; }
  p:last-child { margin-bottom: 0; }
  strong { color: $font-black-1; }
  a { color: $color-main; text-decoration: none; &:hover { text-decoration: underline; } }
}

@media (max-width: 768px) {
  .app-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding-bottom: calc(60px + 16px);
  }
  .af-links { gap: 14px; flex-wrap: wrap; }
}
</style>
