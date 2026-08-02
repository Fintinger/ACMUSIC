<template>
  <div class="all-list">
    <el-row class="cat-list">
      <el-row v-for="(c,index) in categories" :key="index" class="cat">
        <el-col :span="4" class="cat-name">{{ c }}</el-col>
        <el-col v-if="allTag[c].length" :span="20" class="cat-item">
          <el-button v-for="(t,ind) in allTag[c]" :key="ind" size="mini" @click="tagClick(t.name)">
            {{ t.name }}
          </el-button>
        </el-col>
      </el-row>
    </el-row>
    <el-row class="render-list">
      <GridSkeleton v-if="loading && !renderList.length" type="playlist"/>
      <PlaylistLayout v-if="renderList.length" :list="renderList" pic-name="coverImgUrl"/>
    </el-row>
    <el-row class="load-more">
      <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

export default {
  name: "AllList",
  components: {PlaylistLayout, LoadMore, GridSkeleton},
  data() {
    return {
      categories: [],
      allTag: {},
      curTag: "全部",
      renderList: [],
      params: {
        cat: "全部",
        limit: 24,
        order: 'hot',
      },
      page: 0,
      loading: false,
      more: true,
    }
  },
  computed: {
    offset() {
      return this.params.limit * this.page
    },
    noMore() {
      return !this.more
    }
  },
  watch: {
    curTag(n) {
      this.page = 0;
      this.getListByClass(n).then(res => {
        this.renderList = res.data.playlists
        this.more = res.data.more
      }).finally(() => { this.loading = false })
    }
  },
  methods: {
    getCategories() {
      return this.$axios('/playlist/catlist')
    },
    getListByClass(cat) {
      return this.$axios('/top/playlist?', {params: {...this.params, cat, offset: this.offset}})
    },
    handleCategoricalData(cat) {
      //将得到的对象类型的分类数据变成数组类型
      this.categories = Array.from(Object.values(cat.categories), x => x);

      //解析各分类下的tag
      //1:先初始化allTag对象
      this.categories.map(val => {
        this.allTag[val] = []
      })
      //2:allTag对象中加入内容
      cat.sub.map(val => {
        this.allTag[this.categories[val.category]].push(val)
      })
    },
    concurrentRequests() {
      this.loading = true
      this.$axios.all([this.getCategories(), this.getListByClass("全部")])
          .then(this.$axios.spread((categories, list) => {
            this.handleCategoricalData(categories.data);
            this.renderList = list.data.playlists
            this.more = list.data.more
          }))
          .finally(() => { this.loading = false })
    },
    tagClick(tag) {
      this.curTag = tag
      this.loading = true
    },
    load() {
      this.page++
      this.loading = true
      this.getListByClass(this.curTag).then(res => {
        res.data.playlists.forEach(val => {
          if (this.renderList.findIndex(item => item.id === val.id) === -1) {
            this.renderList.push(val)
          }
        })
        //记录是否还有更多数据的量
        this.more = res.data.more
        this.loading = false
      })
    }
  },
  activated() {
    //初步加载分类名和全部分类下的歌单
    this.concurrentRequests()
  }
}
</script>

<style lang="scss" scoped>
.all-list {
  .cat-list {
    .cat {
      display: flex;
      align-items: flex-start;
      margin-bottom: 16px;

      .cat-name {
        font-size: 14px;
        font-weight: 600;
        color: #555;
        min-width: 56px;
        padding-top: 6px;
      }

      .cat-item {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        .el-button {
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          background: #f5f5f7;
          border: 1px solid transparent;
          color: #888;
          transition: all .2s;

          &:hover {
            color: #8685EF;
            background: rgba(134,133,239,.08);
          }
        }
      }
    }
  }
}
</style>