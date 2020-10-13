<template>
  <div>
    <h4 v-if="message!=''" style="margin-top: 20%;text-align: center;">{{ message }}</h4>
    <div class="lds-roller">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
</template>
<script>
export default {
  name: "Loader",
  props: {
    message: { type: String, default: "Please wait" }
  }
};
</script>

<style src="./Loader.scss" lang="scss" />
