/**
 * coverLight mixin
 * 复用 PersonalFM 的封面亮度检测思路：把图片绘制到 32x32 canvas，
 * 用 0.299R + 0.587G + 0.114B 计算平均亮度，> 180 视为浅色封面。
 * 用于动态决定文字/遮罩配色，避免「深色背景+深色字」或「浅色背景+浅色字」看不清。
 *
 * 用法：
 *   import coverLight from '@/mixins/coverLight'
 *   mixins: [coverLight]
 *   // 模板里 :class="{ 'dark-bg': someUrl && !isLightCover(someUrl) }"
 */

export default {
  data() {
    return {
      // 按 url 缓存检测结果：true=浅色, false=深色, undefined=尚未检测完
      coverLight: {}
    }
  },
  methods: {
    /**
     * 判断图片是否浅色封面（平均亮度 > 180）。
     * 同步返回当前已知结果；首次调用会异步触发检测，完成后 $set 触发重渲染自动补上样式。
     * @param {string} url
     * @returns {boolean} 浅色为 true，深色/未就绪为 false
     */
    isLightCover(url) {
      if (!url) return false
      if (this.coverLight[url] !== undefined) return this.coverLight[url]
      this.detectLightness(url)
      return false
    },
    /**
     * 加载图片并计算平均亮度，结果写入 this.coverLight（响应式）。
     * CORS 失败或解码异常时保守按「深色」处理（false）。
     */
    detectLightness(url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const size = 32
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, size, size)
          const data = ctx.getImageData(0, 0, size, size).data
          let sum = 0
          let count = 0
          for (let i = 0; i < data.length; i += 4) {
            sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
            count++
          }
          const avg = sum / count
          this.$set(this.coverLight, url, avg > 180)
        } catch (e) {
          this.$set(this.coverLight, url, false)
        }
      }
      img.onerror = () => { this.$set(this.coverLight, url, false) }
      img.src = url
    }
  }
}
