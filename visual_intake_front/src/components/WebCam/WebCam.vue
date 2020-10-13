<template>
  <div>
    <Loader style="margin-top: 30%;"
      v-if="!isVideoLive"
      :message="'Please wait while the camera is being loaded'"
    ></Loader>
    <video
      ref="video"
      :width="width"
      :height="height"
      :src="source"
      :autoplay="autoplay"
      :playsinline="playsinline"
      :style="{ display: display }"
    />
    <canvas
      v-if="display == 'none'"
      ref="canvasDisplay"
      id="canvasDisplay"
      :width="width"
      :height="height"
    />
  </div>
</template>

<script>
// based from https://github.com/VinceG/vue-web-cam/
// import axios from 'axios'
import Loader from "@/components/Loader/Loader";

import { sleep } from "../../util";

export default {
  name: "WebCam",
  components: {
    Loader
  },
  data() {
    return {
      source: null,
      canvas: null,
      camerasListEmitted: false,
      cameras: [],
      imageCapture: {},
      captures: [],
      imgReport: null,
      lastVideoMode: "deviceId",
      camsList: { back: null, front: null },
      inited: false,
      deviceId: null,
      isFrontCam: false,
      isVideoLive: false
    };
  },
  props: {
    width: {
      type: [Number, String],
      default: "100%"
    },
    height: {
      type: [Number, String],
      default: "100%"
    },
    autoplay: {
      type: Boolean,
      default: true
    },
    screenshotFormat: {
      type: String,
      default: "image/jpeg"
    },
    display: {
      type: String,
      default: "none" // if we want to override it
    },
    playsinline: {
      type: Boolean,
      default: true
    },
    mediaConstraints: {
      type: Object,
      default: () => ({
        video: true,
        audio: false
      })
    },
    maxSnapshot: {
      type: [Number],
      default: 3
    },
    debug: {
      type: Boolean,
      default: false
    },
    recommendedZoom: {
      type: Number,
      default: 2.5
    },
    imageCaptureParams: {
      type: Object,
      default: () => ({
        fillLightMode: "flash",
        redEyeReduction: true
      })
    }
  },
  watch: {
    // deviceId: function(newId, oldId) {
    //   if (newId !== oldId && oldId != null) {
    //     this.changeCamera(newId);
    //   }
    // },
    isFrontCam: function(newValue, oldValue) {
      if (newValue !== oldValue) {
        this.changeFrontBack(newValue);
      }
    },
    captures: function(value) {
      this.$emit("capturedImages", value);
    }
  },
  computed: {
    supportFacingMode() {
      let result = "";
      if (navigator.mediaDevices.getSupportedConstraints()["facingMode"]) {
        result = "Supported!";
      } else {
        result = "Not supported!";
      }
      return result;
    },
    Contraints() {
      const facingMode =
        this.mediaConstraints.video.facingMode ||
        (this.isFrontCam ? "user" : "environment");
      const video = {
        ...this.mediaConstraints.video,
        ...(this.deviceId
          ? {
              deviceId: { exact: this.deviceId }
            }
          : {}),
        facingMode
      };
      // alert(JSON.stringify(video))
      return {
        video: video,
        audio: this.mediaConstraints.audio
      };
    }
  },
  mounted() {
    this.setup();
    this.$nextTick(() => {
      window.addEventListener(
        "onorientationchange",
        this.detectOrientationChange
      );
    });
  },
  created() {
    this.detectOrientationChange(); // when instance is created
  },
  methods: {
    loadSrcStream(stream) {
      if (!this.$refs.video) return;
      if ("srcObject" in this.$refs.video) {
        // new browsers api
        try {
          this.$refs.video.srcObject = stream;
        } catch (err) {
          console.log(err);
        }
      } else {
        // old broswers
        this.source = window.HTMLMediaElement.srcObject(stream);
      }
      this.$refs.video.onloadedmetadata = () => {
        this.isVideoLive = true;
        this.$emit("video-live", stream);
      };
      this.$emit("started", stream);
    },
    async changeCamera(deviceId) {
      this.stop();
      this.$emit("camera-change", deviceId);
      this.deviceId = deviceId;
      this.loadCamera();
    },
    async loadCameras() {
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        if (this.debug) {
          console.log(deviceInfos);
          console.log(navigator.mediaDevices.getSupportedConstraints());
        }
        deviceInfos.forEach(deviceInfo => {
          if (deviceInfo.kind.toLowerCase() === "videoinput") {
            this.cameras.push(deviceInfo);
            if (deviceInfo.label.toLowerCase().indexOf("back") !== -1) {
              this.camsList.back = deviceInfo;
            }
            if (deviceInfo.label.toLowerCase().indexOf("front") !== -1) {
              this.camsList.front = deviceInfo;
            }
          }
        });

        if (this.isFrontCam && this.camsList.front) {
          this.deviceId = this.camsList.front.deviceId;
        } else if (this.camsList.back) {
          this.deviceId = this.camsList.back.deviceId;
        }

        if (!this.camerasListEmitted) {
          this.$emit("cameras", this.cameras);
          this.camerasListEmitted = true;
        }
      } catch (err) {
        this.$emit("notsupported", err);
        console.log(err);
      }
    },
    stopStreamedVideo(videoElem) {
      const stream = videoElem.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => {
        // stops the video track
        track.stop();
        this.$emit("stopped", stream);
        this.$refs.video.srcObject = null;
        this.source = null;
      });
    },
    // Stop the video
    stop() {
      if (this.$refs.video !== null && this.$refs.video.srcObject) {
        if (this.debug) console.log("stoping");
        this.stopStreamedVideo(this.$refs.video);
      }
    },
    async setup() {
      await this.loadCameras();
      this.start();
    },
    // Start the video
    start() {
      this.loadCamera();
    },
    isMobile() {
      return typeof window.orientation !== "undefined";
    },
    toggleFrontBack() {
      this.isFrontCam = !this.isFrontCam;
    },
    changeFrontBack(newFrontCam) {
      if (newFrontCam && this.camsList.front) {
        this.changeCamera(this.camsList.front.deviceId);
      }
      if (!newFrontCam && this.camsList.back) {
        this.changeCamera(this.camsList.back.deviceId);
      }
    },
    loadCamera() {
      if (this.debug) console.log(this.Contraints);

      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        alert(
          "We are sorry, but your browser is not supported, please try another browser or switch a device"
        );
        this.$emit("error", "getUserMedia() is not supported by your browser");
      }

      navigator.mediaDevices
        .getUserMedia(this.Contraints)
        .then(async stream => {
          await sleep(1500);

          // console.log('Got stream', stream)
          const mediaStreamTrack = stream.getVideoTracks()[0];
          if (window.ImageCapture) {
            this.imageCapture = new ImageCapture(mediaStreamTrack);
          }
          const capabilities = mediaStreamTrack.getCapabilities();
          if (self.debug) {
            console.log(capabilities);
          }

          // Check whether zoom is supported or not.
          if ("zoom" in capabilities) {
            mediaStreamTrack.applyConstraints({
              advanced: [
                {
                  zoom: this.recommendedZoom,
                  focusDistance: this.recommendedZoom,
                  focusMode: "single-shot"
                }
              ]
            });
          }
          // else{
          //     return Promise.reject(
          //     "Zoom is not supported by " + mediaStreamTrack.label
          //   );
          // }
          this.video = this.$refs.video;
          this.loadSrcStream(stream);
        })
        .catch(error => {
          console.error("Error accessing media devices.", error);
          this.$emit("error", error);
        });
    },
    async capture() {
      if (window.ImageCapture) {
        const gURL = await this.gCapture();
        return gURL;
      }
      this.canvas = this.getCanvas();
      const URL = this.canvas.toDataURL(this.screenshotFormat, 1);
      this.saveSnapShot(URL);
      return URL;
    },
    saveSnapShot(URL) {
      if (this.captures.length > this.maxSnapshot) {
        this.captures.shift();
      }
      this.captures.push({
        image: URL,
        imgReport: {}
      });

      if (this.debug) console.log("saved SnapShot");
      return URL;
    },
    async gCapture() {
      const blob = await this.imageCapture.takePhoto(this.imageCaptureParams);
      const reader = new FileReader();
      let URL = null;
      return new Promise((resolve, reject) => {
        reader.onerror = err => {
          console.error(err);
          reader.abort();
          reject();
        };
        reader.onloadend = () => {
          URL = reader.result;
          this.saveSnapShot(URL);
          if (this.debug) console.log(URL);
          resolve(URL);
        };
        reader.readAsDataURL(blob);
      });
    },
    getCanvas() {
      // Gets the video as a canvas - good for snapshots
      const video = this.$refs.video;
      const canvas = document.createElement("canvas");
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas;
    },
    drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
      if (arguments.length === 2) {
        x = y = 0;
        w = ctx.canvas.width;
        h = ctx.canvas.height;
      }

      // default offset is center
      offsetX = typeof offsetX === "number" ? offsetX : 0.5;
      offsetY = typeof offsetY === "number" ? offsetY : 0.5;

      // keep bounds [0.0, 1.0]
      if (offsetX < 0) offsetX = 0;
      if (offsetY < 0) offsetY = 0;
      if (offsetX > 1) offsetX = 1;
      if (offsetY > 1) offsetY = 1;

      var iw = img.width,
        ih = img.height,
        r = Math.min(w / iw, h / ih),
        nw = iw * r, // new prop. width
        nh = ih * r, // new prop. height
        cx,
        cy,
        cw,
        ch,
        ar = 1;

      // decide which gap to fill
      if (nw < w) ar = w / nw;
      if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; // updated
      nw *= ar;
      nh *= ar;

      // calc source rectangle
      cw = iw / (nw / w);
      ch = ih / (nh / h);

      cx = (iw - cw) * offsetX;
      cy = (ih - ch) * offsetY;

      // make sure source rectangle is valid
      if (cx < 0) cx = 0;
      if (cy < 0) cy = 0;
      if (cw > iw) cw = iw;
      if (ch > ih) ch = ih;

      // fill image in dest. rectangle
      ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
    },
    drawVideoOnCanvas() {
      // Draws the video on top of the canvas
      const video = this.$refs.video;
      var height = this.height;
      var width = this.width;

      var canvas = document.createElement("canvas");
      if (this.$refs.canvasDisplay) {
        canvas = this.$refs.canvasDisplay;
      }
      canvas.height = height; //video.videoHeight;
      canvas.width = width; //video.videoWidth;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      if (this.isFrontCam) {
        ctx.scale(-1, 1);
        ctx.translate(-width, 0);
      }
      this.drawImageProp(ctx, video, 0, 0, width, height, 0, 0);
      //ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
      //   canvas.height = video.videoHeight;
      //   canvas.width = video.videoWidth;

      return canvas;
    },
    detectOrientationChange() {
      switch (window.orientation) {
        case -90 || 90:
          // landscape
          this.$emit("mobile-orientation", "landscape");
          break;
        default:
          // portrait
          this.$emit("mobile-orientation", "portrait");
          break;
      }
    }
    /* type = 
    'LABEL_DETECTION': Labels can identify objects, locations, activities, animal species, products, and more.
    'TEXT_DETECTION': (OCR TEXT_DETECTION detects and extracts text from any image), 
    'DOCUMENT_TEXT_DETECTION': DOCUMENT_TEXT_DETECTION extracts text from an image; the response is optimized for dense text and documents. The JSON includes page, block, paragraph, word, and break information
    */
    // async googleVision (type = "LABEL_DETECTION", index) {
    //   if (!this.googleKey) {
    //     console.log("no google key detected")
    //     return
    //   }
    //   const API_URL = `https://vision.googleapis.com/v1/images:annotate?key=${this.googleKey}`
    //   let imgIndex = index
    //   if (!index || typeof index === 'undefined') {
    //     imgIndex = this.captures.length - 1
    //   }
    //   const sendData = {
    //     requests: [{
    //       image: {
    //         content: this.captures[imgIndex].image
    //           .replace('data:image/jpeg;base64,', '')
    //       },
    //       features: { type }
    //     }]
    //   }
    //   const { data } = await axios.post(
    //     API_URL,
    //     sendData
    //   )
    //   if (data && data.responses[0]) {
    //     this.imgReport = data.responses[0]
    //     this.captures[imgIndex].imgReport = data.responses[0]
    //   }
    //   if (this.debug) console.log(this.imgReport)
    //   this.$emit('googleReport', this.imgReport)
    //   return this.imgReport
    // }
  }
};
</script>
