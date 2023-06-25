<template>
  <div class="sdk-use-template-wrapper">
    <button @click="getUser">获取用户信息</button>
  </div>
</template>

<script>
import sdk from "../sdk";
export default {
  name: "SdkUseTemplate",
  data() {
    return {};
  },
  methods: {
    getUser() {
      sdk.getUserInfo({
        data: {},
        success(res) {
          console.log("成功", res);
        },
        fail(err) {
          console.log("失败", err);
        },
        complete: (res) => {
          console.log("成功、失败都返回", res);
        },
      });
    },
  },
  mounted() {},
};
</script>
<style>
</style>
