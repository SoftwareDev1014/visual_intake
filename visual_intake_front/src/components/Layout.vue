<template>
  <div class="h-100">
    <router-view class="child"></router-view>
  </div>
</template>
<script>
import { Auth } from "aws-amplify";
export default {
  name: "Layout",
  created() {
    this.init();
  },
  methods: {
    async init() {
      try {
        const user = await Auth.currentAuthenticatedUser();
        console.log("user", user);
        this.$store.state.user = user;
      } catch (e) {
        this.$router.push("/");
      }
    }
  }
};
</script>
