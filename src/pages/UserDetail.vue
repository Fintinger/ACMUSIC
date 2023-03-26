<template>
  <UserDetailLayout :uid="uid"/>
</template>

<script>
import UserDetailLayout from "@/components/layout/UserDetailLayout";

export default {
  name: "UserDetail",
  props: ["uid"],
  components: {UserDetailLayout}
}
</script>

<style scoped>

</style>