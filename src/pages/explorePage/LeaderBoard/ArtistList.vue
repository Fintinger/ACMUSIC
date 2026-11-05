<template>
  <div class="artist-list">
    <div class="artist-list-head">
      <h2>歌手榜</h2>
        <el-select v-model="type" placeholder="请选择">
          <el-option
              v-for="item in options"
              :key="item.type"
              :label="item.label"
              :value="item.type">
          </el-option>
        </el-select>

    </div>
    <GridSkeleton v-if="loading" type="artist"/>
    <EmptyState v-else-if="error" title="歌手榜加载失败" action-text="重试" @action="getArtistList(type)"/>
    <ArtistLayout v-else-if="artistList.length" :list="artistList"/>
    <EmptyState v-else title="暂无歌手榜数据"/>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import GridSkeleton from '@/components/Skeleton/GridSkeleton';
import ArtistLayout from "@/components/layout/ArtistLayout";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "ArtistList",
  components: {ArtistLayout, EmptyState, GridSkeleton},
  data() {
    return {
      artistList: [],
      loading: true, error: false, requestVersion: 0,
      options: [{
        type: 1,
        label: '华语'
      }, {
        type: 2,
        label: '欧美'
      }, {
        type: 3,
        label: '韩国'
      }, {
        type: 4,
        label: '日本'
      }],
      type: 1,
    }
  },
  watch: {
    type(val) {
      this.getArtistList(val)
    }
  },
  methods: {
    async getArtistList(type) {
      const version = ++this.requestVersion
      this.loading = true; this.error = false
      try {
        const res = await playlistApi.toplistArtist(type)
        if (version !== this.requestVersion) return
        const list = res.data && res.data.list && res.data.list.artists
        if (!Array.isArray(list)) throw new Error('Invalid artist chart')
        this.artistList = list
      } catch (_) { if (version === this.requestVersion) this.error = true }
      finally { if (version === this.requestVersion) this.loading = false }
    }
  },
  beforeDestroy() { this.requestVersion++ },
  activated() {
    this.getArtistList(this.type)
  }
}
</script>

<style lang="scss" scoped>
.artist-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  h2 { margin: 0; }
  .el-select { width: 160px; }
  ::v-deep .el-input__inner {
    background: var(--c-bg-sunken);
    color: var(--c-text-primary);
    border: 1px solid var(--c-border-strong);
    border-radius: 12px;
    &:focus { border-color: var(--c-accent); }
  }
}
</style>
