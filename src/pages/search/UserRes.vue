<template>
  <div class="userRes">
    <h2>用户</h2>
    <el-row>
      <GridSkeleton v-if="searchLoading" :count="6" type="artist"/>
      <div v-if="!searchLoading" class="user-list">
        <div v-for="u in list" :key="u.userId" class="user-card" @click="uClk(u.userId)">
          <div class="user-avatar"><img :src="u.avatarUrl" alt=""></div>
          <div class="user-info">
            <div class="user-name">
              {{ u.nickname }}
              <i v-if="u.gender===1" class="el-icon-male"></i>
              <i v-if="u.gender===2" class="el-icon-female"></i>
            </div>
            <div class="user-sign" v-if="u.signature">{{ u.signature }}</div>
          </div>
        </div>
      </div>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "UserRes",
  props: ["keyword"],
  components: {LoadMore, GridSkeleton},
  mixins: [searchMixin],
  data() {
    return { id: 'userId', type: 1002, limit: 12, resultIn: 'userprofiles', countIn: 'userprofileCount', searchLoading: true }
  },
  watch: { list() { this.searchLoading = false } },
  methods: { uClk(uid) { this.$bus.$emit('uClk', uid) } },
  activated() { this.searchLoading = true; this.initLoad() }
}
</script>

<style lang="scss" scoped>
.user-list {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
}
.user-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 20px; border-radius: 16px; min-height: 100px;
  background: #fff; border: 1px solid rgba(0,0,0,.05);
  cursor: pointer; transition: transform .25s, box-shadow .25s;
  animation: fadeUp .35s ease both;
  @for $i from 1 through 10 { &:nth-child(#{$i}) { animation-delay: #{$i * .04}s; } }
  &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
}
.user-avatar {
  flex-shrink: 0; width: 64px; height: 64px; border-radius: 50%; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.user-info { flex: 1; min-width: 0; }
.user-name {
  font-size: 16px; font-weight: 600; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  i { display: inline-block; width: 14px; height: 14px; border-radius: 50%; margin-left: 4px; vertical-align: middle; }
  i.el-icon-male { background: #47a1ce; }
  i.el-icon-female { background: #ff86b6; }
}
.user-sign { font-size: 13px; color: #999; margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 900px) { .user-list { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 600px) { .user-list { grid-template-columns: 1fr; } }
</style>
