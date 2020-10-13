import Vue from "vue";
import VueRouter from "vue-router";
import Layout from "@/components/Layout";
import Home from "../pages/Home";

Vue.use(VueRouter);

const routes = [
  {
    path: '/',
    name:"Home",
    component: Home
  },
  {
    path: "/eye",
    component: Layout,
    children: [
      {
        path: "capture",
        name: "EyeCapture",
        // route level code-splitting
        // this generates a separate chunk (EyeCapture.[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        component: () =>
          import(
            /* webpackChunkName: "EyeCapture" */
            "@/pages/EyeCapture/EyeCapture.vue"
          )
      },
      {
        path: "intro",
        name: "EyeCaptureIntro",
        component: () =>
          import(
            /* webpackChunkName: "EyeCapture" */
            "@/pages/EyeCapture/EyeCaptureIntro.vue"
          )
      }
    ]
  }
];

const router = new VueRouter({
  routes,
  mode: "hash"
});

export default router;
