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
      <PlaylistLayout :list="renderList" pic-name="coverImgUrl"/>
    </el-row>
    <el-row class="load-more">
      <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";

export default {
  name: "AllList",
  components: {PlaylistLayout, LoadMore},
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
      //初始化page
      this.page = 0;
      this.getListByClass(n).then(res => {
        //
        this.renderList = res.data.playlists
        //记录是否还有更多数据的量
        this.more = res.data.more
      })
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
      //初步加载分类名和全部分类下的歌单
      this.$axios.all([this.getCategories(), this.getListByClass("全部")])
          .then(this.$axios.spread((categories, list) => {
            //处理获取到的分类数据
            this.handleCategoricalData(categories.data);
            //初步加载全部分类歌单
            this.renderList = list.data.playlists
            //记录是否还有更多数据的量
            this.more = list.data.more
          }))
    },
    tagClick(tag) {
      this.curTag = tag
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
      margin-top: 30px;

      .cat-name {
      }

      .cat-item {
        .el-button {
          margin-top: 10px;
        }
      }
    }

  }
}

</style>