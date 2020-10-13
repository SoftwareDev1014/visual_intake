<template>
  <div>
    <b-card
      id="card"
      tag="article"
      class="mx-auto full-width captureContainer"
      no-body
    >
      <div style="height: 100vh;display: flex;justify-content: center">
        <div style="width: fit-content;margin: auto;align-self: center">
          <div>
            <b-button
              squared
              size="lg"
              variant="primary"
              style="margin: 10px 0;width: 100%"
              @click="signWithGoogle"
              >Sign in with Google </b-button
            ><br />
            <b-button
              v-if="isLogin"
              squared
              size="lg"
              variant="success"
              style="margin: 10px 0;width: 100%"
              to="eye/intro"
              >Go to intro
            </b-button>
            <b-button
              v-if="isLogin"
              squared
              size="lg"
              variant="secondary"
              style="margin: 10px 0;width: 100%"
              @click="signOut"
              >Logout
            </b-button>
          </div>
        </div>
      </div>
    </b-card>
  </div>
</template>

<script>
// import GoogleLogin from "vue-google-login";
import { Auth } from "aws-amplify";
Auth.federatedSignIn({ provider: "Google" });

export default {
  name: "Home.vue",
  components: {},
  data() {
    return {
      isLogin: true
    };
  },
  mounted() {
    this.loginCheck();
  },
  methods: {
    async loginCheck() {
      try {
        const user = await Auth.currentAuthenticatedUser();
        this.isLogin = true;
        this.$store.state.user = user;
      } catch (e) {
        this.isLogin = false;
      }
    },
    signWithGoogle() {
      Auth.federatedSignIn({ provider: "Google" });
    },
    signOut() {
      Auth.signOut();
    }
  }
};
</script>

<style src="./Home.scss" lang="scss"></style>
