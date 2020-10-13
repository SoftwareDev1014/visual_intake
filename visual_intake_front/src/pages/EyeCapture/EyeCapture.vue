<template>
  <div>
    <b-card
      id="card"
      tag="article"
      class="mx-auto full-width captureContainer"
      v-if="!img"
      no-body
    >
      <div class="videoContainer">
        <div class="overlay" v-if="displayEyeOverlay && streamStarted">
          <img
            ref="overlay"
            class="eyeImgOverlay"
            :src="require(`@/assets/eye/${imgOverlay}`)"
          />
        </div>
        <div class="overlayText" v-if="displayTextOverlay && streamStarted">
          {{ textOverlay }}
        </div>
        <vue-web-cam
          ref="webcam"
          :device-id="deviceId"
          :height="windowHeight"
          :width="windowWidth"
          @video-live="onStarted"
          @stopped="onStopped"
          @error="onError"
          @cameras="onCameras"
          @camera-change="onCameraChange"
        />
      </div>
      <div class="row align-items-center full-width bottombar" ref="footer">
        <div class="col-4"></div>
        <div class="col-4">
          <button
            type="button"
            class="btn btn-primary btn-lg captureBtn"
            @click="onCapture"
            v-if="!takingThePicture"
          >
            <b-icon-camera></b-icon-camera>
          </button>
          <Loader
            v-if="takingThePicture"
            :message="''"
            style="bottom: 50px;position: absolute;"
          ></Loader>
        </div>
        <div class="col-4">
          <button
            v-if="isFullScreenPossible"
            type="button"
            class="btn btn-primary"
            @click="toggleFullScreen"
          >
            <b-icon-arrows-fullscreen></b-icon-arrows-fullscreen>
          </button>
        </div>
      </div>
    </b-card>
  </div>
</template>

<script>
import { Storage } from "aws-amplify";

import Loader from "../../components/Loader/Loader";
import WebCam from "../../components/WebCam/WebCam";
import {
  drawPoint,
  drawRectangle,
  contains,
  isMobile,
  isWebglSupport
} from "../../util"; //cropCanvas

import EyeRecognitionModel from "../../components/MLModels/EyeRecognitionModel";

export default {
  name: "EyeCapture",
  components: {
    "vue-web-cam": WebCam,
    Loader
  },
  data() {
    return {
      submissionId: 1, //TODO
      eyeDetectionNetwork: null,
      poseNetDetectionNetwork: null,
      blazeFaceNetwork: null,
      countDownInterval: null,
      img: null,
      camera: null,
      deviceId: null,
      streamStarted: false,
      devices: [],
      textOverlay: "Please put your eye where indicated",
      displayEyeOverlay: true,
      displayTextOverlay: true,
      currentStep: 0,
      imgOverlay: "eye_straight.png",
      windowHeight: "500px",
      windowWidth: "500px",
      takingThePicture: false,
      speechSynthesisVoice: null,
      closerInstructionCount: 0,
      inTheMiddleOfSpeaking: false,
      lastInstructionSpoken: "",
      lastFramesRecognized: [],
      // The number of times per second that we run the detection algorithm
      detectionsPerSecond: 2,
      time: Date.now(),
      // The number of frames recognition result we store to determine success recognition
      // Should be determined compared to the `detectionsPerSecond` parameter
      RECOGNITION_FRAMES_HISTORY: 3,
      steps: [
        {
          stepName: "eye_straight",
          overlayImg: "eye_straight.png",
          overlayMessage: "Please look straight to the camera"
        },
        {
          stepName: "eye_left",
          overlayImg: "eye_right.png", //it's mirrored
          overlayMessage: "Please look to the left"
        },
        {
          stepName: "eye_right",
          overlayImg: "eye_left.png", //it's mirrored
          overlayMessage: "Please look to the right"
        },
        {
          stepName: "eye_up",
          overlayImg: "eye_up.png",
          overlayMessage: "Please look up"
        },
        {
          stepName: "eye_down",
          overlayImg: "eye_down.png",
          overlayMessage: "Please look down"
        },
        {
          stepName: "eye_closed",
          overlayImg: "eye_closed.png",
          overlayMessage: "Last one, please close your eyes"
        }
      ]
    };
  },
  computed: {
    device: function() {
      return this.devices.find(n => n.deviceId === this.deviceId);
    },
    isFullScreenPossible: function() {
      return (
        document.fullscreenElement && document.documentElement.requestFullscreen
      );
    }
  },
  async mounted() {
    if (!isMobile()) {
      alert("We are sorry, but we work only on mobile devices!");
      this.$router.push("/eye/intro");
    }

    this.windowHeight = window.innerHeight - this.getFooterSize();
    this.$refs.footer.style = "height: " + this.getFooterSize() + "px";
    this.windowWidth = window.innerWidth;
    var parent = this;
    window.addEventListener("resize", () => {
      this.windowHeight = window.innerHeight - parent.getFooterSize();
      this.$refs.footer.style = "height: " + parent.getFooterSize() + "px";
      this.windowWidth = window.innerWidth;
    });

    this.setSpeech().then(speechSynthesisVoices => {
      speechSynthesisVoices.forEach(speechSynthesisVoice => {
        if (speechSynthesisVoice.lang == "en_US") {
          this.speechSynthesisVoice = speechSynthesisVoice;
        }
      });
    });
    // We currently use posenet because it has better accuracy (the downside is that it has bad latency)
    if (window.posenet) {
      this.poseNetDetectionNetwork = await window.posenet.load();
    }

    //this.blazeFaceNetwork = await window.blazeface.load(1)
    this.eyeDetectionNetwork = new EyeRecognitionModel("/model/model.json");
    await this.eyeDetectionNetwork.load();
  },
  watch: {
    camera: function(id) {
      this.deviceId = id;
    },
    devices: function() {
      // Once we have a list select the first one
      const [first] = this.devices;
      if (first) {
        this.camera = first.deviceId;
        this.deviceId = first.deviceId;
      }
    }
  },
  methods: {
    uploadImage(canvas, params, cb) {
      let self = this;
      try {
        canvas.toBlob(async function(blob) {
          let user = self.$store.state.user;
          let r = Math.random()
            .toString(36)
            .substring(7);
          console.log("random", r);
          // Storage.configure({ level: 'private' });
          const { key } = await Storage.put(
            `${user.pool.clientId}/${r}.png`,
            blob
          );
          let storerage = await Storage.get(key, { expires: 60 });
          console.log("S3 Object key", key, storerage, blob);
          cb({
            url: storerage
          });
        });
      } catch (error) {
        alert(
          "An error occurred while trying to save the images at our servers. Sorry for the inconvenience, please try again later."
        );
      }
    },
    toggleCamera() {
      this.$refs.webcam.toggleFrontBack();
    },
    toggleFullScreen() {
      if (!document.fullscreenElement) {
        document.documentElement
          .requestFullscreen()
          .then(async () => {
            if (screen.orientation) {
              try {
                await screen.orientation.lock("portrait");
              } catch (err) {
                console.log(err);
              }
            }
          })
          .catch(err => {
            console.log(err);
          });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    },
    async onCapture() {
      var canvas = this.$refs.webcam.getCanvas();
      if (this.isImageBlurry(canvas)) {
        this.textOverlay = "The image is blurry, please try again";
        this.speak(this.textOverlay);
      } else {
        // var overlayBoundingBox = this.$refs.overlay.getBoundingClientRect();
        // var croppedCanvas = cropCanvas(canvas,overlayBoundingBox.left,overlayBoundingBox.top,overlayBoundingBox.width,overlayBoundingBox.height)
        // const URL = croppedCanvas.toDataURL("image/jpeg", 1);

        // this.img displays the image in the canvas
        //this.img = await this.$refs.webcam.capture();
        //var capturedImg = await this.$refs.webcam.capture();
        var params = {
          type: this.steps[this.currentStep].stepName,
          submissionId: this.submissionId
        };
        this.takingThePicture = true;
        this.uploadImage(canvas, params, result => {
          if (result.url) {
            window.localStorage.setItem(
              this.steps[this.currentStep].stepName,
              result.url
            );
            this.nextStep();
            this.takingThePicture = false;
          }
        });
        //window.localStorage.setItem(this.steps[this.currentStep].stepName, capturedImg);
        // this.steps[this.currentStep]["capturedImg"] = await this.$refs.webcam.capture();
        //this.nextStep()
      }
    },
    startCountdown(func, countDownSeconds = 3) {
      var num = countDownSeconds;
      this.countDownInterval = setInterval(() => {
        console.log(num);
        if (num == 1) {
          // We take the picture on 1 because we don't want them to move
          func();
        }
        if (num == 0) {
          clearInterval(this.countDownInterval);
          this.countDownInterval = null;
        } else {
          this.textOverlay = num;
          this.speak(num);
          num = num - 1;
        }
      }, 1000);
    },
    getBoundingBoxPerStep() {
      var overlayboundingBox = this.$refs.overlay.getBoundingClientRect();
      if (this.steps[this.currentStep].stepName == "eye_left") {
        overlayboundingBox.x =
          overlayboundingBox.x + overlayboundingBox.width / 2;
        overlayboundingBox.width /= 2;
      } else if (this.steps[this.currentStep].stepName == "eye_right") {
        overlayboundingBox.width /= 2;
      } else if (this.steps[this.currentStep].stepName == "eye_up") {
        overlayboundingBox.height /= 2;
      } else if (this.steps[this.currentStep].stepName == "eye_down") {
        overlayboundingBox.y =
          overlayboundingBox.y + overlayboundingBox.height / 2;
        overlayboundingBox.height /= 2;
      }
      return overlayboundingBox;
    },
    isImageBlurry(canvas) {
      if (window.tf) {
        // Reads the image, converts to gray and makes shape (1, width, height, 1) [batch, in_height, in_width, in_channels]
        let _grayscaleFrame = window.tf.browser
          .fromPixels(canvas)
          .mean(2)
          .toFloat()
          .expandDims(0)
          .expandDims(-1);

        // prepare convolution to get laplacian
        let _laplaceFilter = window.tf
          .tensor2d([
            [0, 1, 0],
            [1, -4, 1],
            [0, 1, 0]
          ])
          .expandDims(-1)
          .expandDims(-1); // [filter_height, filter_width, in_channels, out_channels]

        // get laplacian
        let _laplacian = _grayscaleFrame
          .conv2d(_laplaceFilter, 1, "valid")
          .squeeze();

        // get standard deviation
        let _standardDeviation = window.tf
          .moments(_laplacian)
          .variance.asScalar()
          .bufferSync().values[0];

        // dispose tensor to avoid memeory leaks
        _grayscaleFrame.dispose();
        _laplaceFilter.dispose();
        _laplacian.dispose();

        // laplaceFilter is an edge detector, blured images' edges are smoothed, so the variance is small.
        return _standardDeviation * _standardDeviation < 100;
      }
      return false;
    },
    detectEyeUsingOpencv(canvas, draw = false) {
      // Currently not activated
      var cv = null;
      if (window.cv) {
        cv = window.cv;
      }
      //let src = cv.imread('canvasDisplay');
      let ctx = canvas.getContext("2d");
      let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let src = cv.matFromImageData(imgData);
      cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
      cv.threshold(src, src, 85, 255, cv.THRESH_BINARY);
      let M = cv.Mat.ones(5, 5, cv.CV_8U);
      let anchor = new cv.Point(-1, -1);
      cv.dilate(
        src,
        src,
        M,
        anchor,
        2,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue()
      );
      cv.erode(
        src,
        src,
        M,
        anchor,
        1,
        cv.BORDER_CONSTANT,
        cv.morphologyDefaultBorderValue()
      );

      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      // You can try more different parameters
      cv.findContours(
        src,
        contours,
        hierarchy,
        cv.RETR_CCOMP,
        cv.CHAIN_APPROX_SIMPLE
      );
      // draw contours with random Scalar
      var cx = 0;
      var cy = 0;
      var radius = 0;
      var largestContourArea = 0;
      var boundingRect = this.$refs.overlay.getBoundingClientRect();
      for (let i = 0; i < contours.size(); ++i) {
        var contour = contours.get(i);
        var area = cv.contourArea(contour);
        if (
          area > largestContourArea &&
          area < boundingRect.width * boundingRect.height
        ) {
          largestContourArea = area;
          var center = cv.moments(contour);
          cx = center["m10"] / center["m00"];
          cy = center["m01"] / center["m00"];
          var rect = cv.boundingRect(contour);
          radius = 0.25 * (rect.width + rect.height);
        }
        contour.delete();
      }
      if (draw) {
        drawPoint(ctx, cy, cx, radius, "red", false);
      }
      src.delete();
      M.delete();
      contours.delete();
      hierarchy.delete();
      return [cx, cy];
    },
    detectEyeUsingPosenet(poseDetection, ctx = null, threshold = 0.8) {
      var leftEye = { score: 0 };
      var rightEye = { score: 0 };
      if (poseDetection) {
        poseDetection.keypoints.forEach(({ score, position, part }) => {
          if (score >= threshold) {
            if (part == "leftEye") {
              leftEye = { position: position, score: score };
            } else if (part == "rightEye") {
              rightEye = { position: position, score: score };
            } else {
              return;
            }
            const { y, x } = position;
            if (ctx) {
              drawPoint(ctx, y, x, 5, "aqua");
            }
          }
        });
      }

      return [leftEye, rightEye];
    },
    detectEyeUsingBlazeFace(predictions, ctx = null, threshold = 0.8) {
      var leftEye = { score: 0 };
      var rightEye = { score: 0 };
      var topScore = threshold;
      if (predictions && predictions.length > 0) {
        for (let i = 0; i < predictions.length; i++) {
          predictions[i].probability = predictions[i].probability.arraySync();
          if (predictions[i].probability[0] > topScore) {
            predictions[i].landmarks = predictions[i].landmarks.arraySync();

            topScore = predictions[i].probability[0];
            rightEye = {
              score: predictions[i].probability[0],
              position: {
                x: predictions[i].landmarks[0][0],
                y: predictions[i].landmarks[0][1]
              }
            };
            leftEye = {
              score: predictions[i].probability[0],
              position: {
                x: predictions[i].landmarks[1][0],
                y: predictions[i].landmarks[1][1]
              }
            };

            if (ctx) {
              drawPoint(
                ctx,
                rightEye.position.y,
                rightEye.position.x,
                5,
                "blue"
              );
              drawPoint(ctx, leftEye.position.y, leftEye.position.x, 5, "blue");
            }
          }
        }
      }
      return [leftEye, rightEye];
    },
    getLeftAndRightEyes(ctx, models) {
      var [leftEyePosenet, rightEyePosenet] = this.detectEyeUsingPosenet(
        models.poseDetection,
        ctx,
        0.5
      );

      var [leftEyeBlazeFace, rightEyeBlazeFace] = this.detectEyeUsingBlazeFace(
        models.faceDetection,
        ctx,
        0.7
      );

      var leftEye = { score: 0 };
      if (leftEyePosenet.position && leftEyeBlazeFace.position) {
        leftEye = {
          score: (leftEyePosenet.score + leftEyeBlazeFace.score) / 2,
          position: {
            x: (leftEyePosenet.x + leftEyeBlazeFace.x) / 2,
            y: (leftEyePosenet.y + leftEyeBlazeFace.y) / 2
          }
        };
      } else {
        if (!leftEyePosenet.position) {
          leftEye = leftEyeBlazeFace;
        } else if (!leftEyeBlazeFace.position) {
          leftEye = leftEyePosenet;
        }
      }

      var rightEye = { score: 0 };
      if (rightEyePosenet.position && rightEyeBlazeFace.position) {
        rightEye = {
          score: (rightEyePosenet.score + rightEyeBlazeFace.score) / 2,
          position: {
            x: (rightEyePosenet.x + rightEyeBlazeFace.x) / 2,
            y: (rightEyePosenet.y + rightEyeBlazeFace.y) / 2
          }
        };
      } else {
        if (!rightEyePosenet.position) {
          rightEye = rightEyeBlazeFace;
        } else if (!rightEyeBlazeFace.position) {
          rightEye = rightEyePosenet;
        }
      }
      return [leftEye, rightEye];
    },
    async detectRealtime() {
      if (this.$refs.webcam) {
        var elapsed = Date.now() - this.time;

        this.$refs.webcam.drawVideoOnCanvas();

        //  twice a second we run the prediction
        if (
          elapsed > 1000 / this.detectionsPerSecond &&
          (this.poseNetDetectionNetwork || this.blazeFaceNetwork) &&
          !(this.countDownInterval || this.inTheMiddleOfSpeaking) &&
          isWebglSupport()
        ) {
          // TODO: Check performance on WASM because it runs on 90% of devices

          var video = this.$refs.webcam.video;

          var promise = new Promise(resolve => setTimeout(() => resolve(), 10));

          // Use pose detection to detect the eyes (works pretty well)
          var poseDetection = promise;
          if (this.poseNetDetectionNetwork) {
            poseDetection = this.poseNetDetectionNetwork.estimateSinglePose(
              video,
              {
                flipHorizontal: this.$refs.webcam.isFrontCam
              }
            );
          }
          var faceDetection = null; //promise
          if (this.blazeFaceNetwork) {
            faceDetection = this.blazeFaceNetwork.estimateFaces(
              video,
              true,
              this.$refs.webcam.isFrontCam
            );
          }

          var eyeDetection = promise;
          if (this.eyeDetectionNetwork && this.eyeDetectionNetwork.isLoaded()) {
            eyeDetection = this.eyeDetectionNetwork.predict(video);
          }

          // This is where the predictions run
          Promise.all([eyeDetection, poseDetection]).then(
            (eyeDetection, poseDetection) => {
              var [isEyeScore, eyePredictions, eyeBoundingBox] = eyeDetection;

              if (!this.$refs.webcam) return;
              var canvas = this.$refs.webcam.drawVideoOnCanvas();

              const ctx = canvas.getContext("2d");

              var [leftEye, rightEye] = this.getLeftAndRightEyes(ctx, {
                faceDetection: faceDetection,
                poseDetection: poseDetection
              });

              var overlayBoundingBox = this.getBoundingBoxPerStep(); //this.$refs.overlay.getBoundingClientRect();
              // ctx.beginPath();
              // ctx.rect(overlayBoundingBox.x,overlayBoundingBox.y,overlayBoundingBox.width,overlayBoundingBox.height);
              // ctx.stroke();

              if (this.lastFramesRecognized.length == 0) {
                this.lastFramesRecognized = [0, 0];
              }
              var sumOfRecognitionFrames = this.lastFramesRecognized.reduce(
                (prev, curr) => prev + curr
              );

              var distBetweenEyes = 1000;
              if (leftEye.position && rightEye.position) {
                distBetweenEyes = Math.sqrt(
                  Math.pow(rightEye.position.x - leftEye.position.x, 2) +
                    Math.pow(rightEye.position.y - leftEye.position.y, 2)
                );
              }

              // If both left eye and right eye are found we want them to look closer
              if (
                leftEye.score > 0 &&
                rightEye.score > 0 &&
                distBetweenEyes > 200 &&
                sumOfRecognitionFrames > 0 &&
                sumOfRecognitionFrames < this.RECOGNITION_FRAMES_HISTORY / 2
              ) {
                this.lastFramesRecognized.push(0);
                var text =
                  "Please make sure that your eye stays around the overlay";
                this.textOverlay = text;
                if (this.closerInstructionCount < 1) {
                  this.speak(text);
                  this.closerInstructionCount += 1;
                }
              } else if (
                isEyeScore > 0.98 &&
                (leftEye.score > 0 || rightEye.score > 0)
              ) {
                if (eyePredictions) {
                  drawRectangle(
                    ctx,
                    eyeBoundingBox[0][0],
                    eyeBoundingBox[0][1],
                    Math.abs(eyeBoundingBox[0][0] - eyeBoundingBox[1][0]),
                    Math.abs(eyeBoundingBox[0][1] - eyeBoundingBox[1][1])
                  );
                  // drawPoint(ctx, meanPoint[1], meanPoint[0], 5, "red");
                  eyePredictions.forEach(point => {
                    drawPoint(ctx, point[1], point[0], 2, "green");
                  });
                }

                // If only one of them is found, it's good
                //this.textOverlay = "Good, now try to put your pupil inside the circle";

                // When we are close enough, we want another validation regarding the pupil finding (using OpenCV's findContours)
                //const positionOpenCV = this.detectEyeUsingOpencv(canvas, true);
                const positionPoseNet =
                  leftEye.score > rightEye.score
                    ? leftEye.position
                    : rightEye.position;

                if (contains(overlayBoundingBox, positionPoseNet)) {
                  this.lastFramesRecognized.push(1);
                  // Are we consistant with the detection?
                  if (
                    sumOfRecognitionFrames >
                    this.RECOGNITION_FRAMES_HISTORY / 2
                  ) {
                    var countdown = 3;
                    if (this.currentStep < 2) {
                      this.textOverlay =
                        "Great! Taking the picture in 3 seconds, please don't move";
                    } else {
                      this.textOverlay =
                        Math.random() > 0.5 ? "Awesome!" : "Amazing!";
                    }
                    this.inTheMiddleOfSpeaking = true;
                    this.speak(this.textOverlay, () => {
                      // We start the countdown when we finish to speak the sentence above
                      this.startCountdown(this.onCapture, countdown);
                    });
                  }
                }
              } else {
                this.lastFramesRecognized.push(-1);

                // We need  to NOT recognize the eyes when the eye is closed
                if (
                  this.steps[this.currentStep].stepName == "eye_closed" &&
                  sumOfRecognitionFrames < -5
                ) {
                  this.inTheMiddleOfSpeaking = true;
                  this.textOverlay = "The eyes are closed, Great!";
                  this.speak(this.textOverlay, () => {
                    // We start the countdown when we finish to speak the sentence above
                    this.startCountdown(this.onCapture, 3);
                  });
                }
              }

              // The number of frames recognition result we store to determine success recognition
              if (
                this.lastFramesRecognized.length >
                this.RECOGNITION_FRAMES_HISTORY
              ) {
                this.lastFramesRecognized.shift();
              }

              this.time = Date.now();
            }
          );
        }
      }
      window.requestAnimationFrame(this.detectRealtime);
    },
    onStarted(stream) {
      this.streamStarted = true;
      console.log("On Started Event", stream);
      this.detectRealtime();
    },
    onStopped(stream) {
      console.log("On Stopped Event", stream);
    },
    onStop() {
      this.$refs.webcam.stop();
    },
    onStart() {
      this.$refs.webcam.start();
    },
    onError(error) {
      console.log("On Error Event", error);
    },
    speak(text, onEndEvent = null) {
      if (this.lastInstructionSpoken == text) {
        return;
      }
      this.lastInstructionSpoken = text;
      var utterance = new SpeechSynthesisUtterance(text);
      utterance.onerror = function(event) {
        console.log(
          "An error has occurred with the speech synthesis: " + event.error
        );
      };
      utterance.onend = onEndEvent;
      if (this.speechSynthesisVoice) {
        utterance.voice = this.speechSynthesisVoice;
      }
      utterance.volume = 100;
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    backToCameraCapture() {
      this.img = null;
      this.closerInstructionCount = 0;
      this.countDownInterval = null;
      this.inTheMiddleOfSpeaking = false;
      this.textOverlay = this.steps[this.currentStep]["overlayMessage"];
      setTimeout(() => {
        this.$refs.webcam.start();
      });
    },
    async nextStep() {
      this.inTheMiddleOfSpeaking = true;
      this.currentStep += 1;
      console.log("Going to the next step: " + this.currentStep);
      this.lastFramesRecognized = [];
      if (this.currentStep > this.steps.length - 1) {
        this.$router.push("/eye/intro/");
        return;
      }
      this.imgOverlay = this.steps[this.currentStep]["overlayImg"];
      this.textOverlay = this.steps[this.currentStep]["overlayMessage"];
      this.closerInstructionCount = 0;

      this.speak(this.textOverlay, () => {
        this.inTheMiddleOfSpeaking = false;
      });

      this.img = null;
      setTimeout(() => {
        this.$refs.webcam.start();
      });
    },
    onCameras(cameras) {
      this.devices = cameras;
      // console.log("On Cameras Event", cameras);
    },
    onCameraChange(deviceId) {
      this.deviceId = deviceId;
      this.camera = deviceId;
      // console.log("On Camera Change Event", deviceId);
    },
    getFooterSize() {
      if (
        window.orientation &&
        (window.orientation == 90 || window.orientation == -90)
      ) {
        return Math.min(120, document.body.clientHeight / 5); //60;
      }
      return Math.min(120, document.body.clientHeight / 5); //60;
    },
    setSpeech() {
      return new Promise(function(resolve) {
        let synth = window.speechSynthesis;
        let id;

        id = setInterval(() => {
          if (synth.getVoices().length !== 0) {
            resolve(synth.getVoices());
            clearInterval(id);
          }
        }, 10);
      });
    }
  }
};
</script>
<style src="./EyeCapture.scss" lang="scss" />
