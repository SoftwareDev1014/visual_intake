<template>
  <div class="intro-container">
    <div
      class="scroll-container"
      ref="scrollContainer"
      v-on:scroll="handleScroll"
      v-on:touch="handleScroll"
    >
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div class="rightBtn" @click="gotoPage(1)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont" style="flex: 1;">
          Hi {{ name }}, <br />Let's get ready to <br />take some pictures!
        </div>
        <div class="bottomProgressButtons">
          <div class="progressBarCont">
            <div class="ProgressText">{{ percent }}% &nbsp;Completed</div>
            <div class="ProgressBar">
              <div
                class="currentProgress"
                v-bind:style="{ left: computedLeft }"
              ></div>
            </div>
          </div>
          <b-button @click="gotoNext()" class="nextBtn" ref="nextbtn">
            Next&nbsp;
            <img src="/img/icons/arrow.svg" />
          </b-button>
        </div>
      </div>
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(0)">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div
            class="rightBtn"
            @click="gotoPage(2)"
            v-if="
              this.questions.infrontofmirror &&
                this.questions.roomlight &&
                this.questions.lensclean
            "
          >
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont">
          You can do it by
          <br />yourself or use a friend
          <br />
          <br />Before we start, make <br />sure that
          <br />
          <div class="makeSureItems">
            <div class="row">
              <div class="col-3">
                <div class="makesureimage">
                  <img src="/img/icons/camera.svg" />
                </div>
              </div>
              <div class="col-7 makesuretext">
                Are the lens of the rear phone camera clean?
              </div>
              <div class="col-2">
                <div class="round">
                  <input
                    type="checkbox"
                    id="questionlensclean"
                    v-model="questions.lensclean"
                    @change="approveInstructions"
                  />
                  <label for="questionlensclean"></label>
                </div>
              </div>
            </div>
          </div>

          <div class="makeSureItems">
            <div class="row">
              <div class="col-3">
                <div class="makesureimage">
                  <img src="/img/icons/light.svg" />
                </div>
              </div>
              <div class="col-7 makesuretext">
                Is the room well lit?
              </div>
              <div class="col-2">
                <div class="round">
                  <input
                    type="checkbox"
                    id="questionroomlight"
                    v-model="questions.roomlight"
                    @change="approveInstructions"
                  />
                  <label for="questionroomlight"></label>
                </div>
              </div>
            </div>
          </div>

          <div class="makeSureItems">
            <div class="row">
              <div class="col-3">
                <div class="makesureimage">
                  <img src="/img/icons/mirror.svg" />
                </div>
              </div>
              <div class="col-7 makesuretext">
                Are you infront of a mirror?
              </div>
              <div class="col-2">
                <div class="round">
                  <input
                    type="checkbox"
                    id="questioninfrontofmirror"
                    v-model="questions.infrontofmirror"
                    @change="approveInstructions"
                  />
                  <label for="questioninfrontofmirror"></label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(1)">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div class="rightBtn" @click="gotoPage(3)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont">
          When taking the
          <br />pictures, be about 4 <br />inches from the rear <br />camera
          (not selfie) for <br />a focused image
          <img class="titleImage" src="/img/icons/selfie.gif" />
        </div>
      </div>
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(2)">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div class="rightBtn" @click="gotoPage(4)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont">
          Your eye should be
          <br />well centered and fill <br />the frame.
          <br />
          <br />
          <div class="subHead">
            We've added an overlay to help
            <br />
            you place it right
          </div>
          <img class="titleImage" src="/img/icons/overlay.gif" />
        </div>
      </div>
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(3)">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div class="rightBtn" @click="gotoPage(5)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont">
          Last thing before we
          <br />
          start
          <br />
          <div
            class="subHead"
            style="text-align: center;margin-left: 10%;padding: 10px;"
          >
            We need 6 pictures of different directions. Please pull your eyelid
            up and down for pictures 1 and 5
          </div>
          <div class="imagesCont eyeimgcont">
            <div class="srow">
              <div class="numText">1</div>
              <img class="eyeimg" src="/img/icons/eye1.jpg" />
              <div class="numText">2</div>
              <img class="eyeimg" src="/img/icons/eye2.jpg" />
            </div>
            <div class="srow">
              <div class="numText">3</div>
              <img class="eyeimg" src="/img/icons/eye3.jpg" />
              <div class="numText">4</div>
              <img class="eyeimg" src="/img/icons/eye4.jpg" />
            </div>
            <div class="srow">
              <div class="numText">5</div>
              <img class="eyeimg" src="/img/icons/eye5.jpg" />
              <div class="numText">6</div>
              <img class="eyeimg" src="/img/icons/eye6.jpg" />
            </div>
          </div>
        </div>
      </div>
      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(4)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont" style="flex: 1;">
          Lets get started
          <br />
          <div class="camerastarting">
            <router-link to="/eye/capture"
              ><img src="/img/icons/camerastart.svg"
            /></router-link>
          </div>
        </div>
      </div>

      <div class="single-page">
        <div class="navigateButtons">
          <div class="rightBtn" @click="gotoPage(7)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont">
          Great Job! <br />
          Now, let’s make sure <br />
          that the quality is good
          <br />
          <div class="subHead" style="padding:5px 0px 10px 0px">
            Make sure that<br />
            there are no shadows and<br />
            the details are clear
          </div>
          <img class="titleImage" src="/img/icons/goodimage.jpg" />
        </div>
      </div>

      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(6)">
            <img src="/img/icons/arrow.svg" />
          </div>
          <div class="rightBtn" @click="gotoPage(8)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont" style="flex: 1;">
          <br />
          Review the quality. Image is not in focus or not clear?
          <br />
          Click on it and take another try
          <br />
          <div class="imagesCont eyeimgcont" style="width:100%;height:100%;">
            <div class="imgrow">
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_straight') + ')'
                }"
              ></div>
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_left') + ')'
                }"
              ></div>
            </div>
            <div class="imgrow">
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_right') + ')'
                }"
              ></div>
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_up') + ')'
                }"
              ></div>
            </div>
            <div class="imgrow">
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_down') + ')'
                }"
              ></div>
              <div
                class="eyeimgtaken"
                v-bind:style="{
                  backgroundImage: 'url(' + getImage('eye_closed') + ')'
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="single-page">
        <div class="navigateButtons">
          <div class="leftBtn" @click="gotoPage(7)">
            <img src="/img/icons/arrow.svg" />
          </div>
        </div>
        <div class="innerCont" style="text-align: center;">
          <img src="/img/icons/eyecamera.svg" />
          <img src="/img/icons/smile.svg" />
          <br />
          You’re quite an <br />
          eye catcher!<br />
          Awesome work
          <br /><br />
          <b-button
            @click="sendToClinic()"
            variant="primary"
            ref="sendToClinicBtn"
            style="padding:15px"
          >
            Send to Clinic
          </b-button>
        </div>
      </div>

      <div class="single-page">
        <div class="innerCont" style="text-align: center;">
          <br />
          Thanks! <br />See you at your virtual visit
        </div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  name: "EyeCaptureIntro",
  data() {
    return {
      name: "",
      questions: {
        infrontofmirror: false,
        roomlight: false,
        lensclean: false
      },
      curpage: 0,
      totalPage: 9 //length-1
    };
  },
  computed: {
    computedLeft: function() {
      return this.percent - 100 + "%";
    },
    percent: function() {
      var val = (this.curpage / this.totalPage) * 100;
      return val.toFixed(0);
    },
    imagesUploaded: function() {
      return window.localStorage.getItem("eye_closed");
    }
  },
  mounted() {
    if (this.imagesUploaded) {
      this.gotoPage(6);
    } else {
      this.gotoPage(0);
    }
  },
  methods: {
    approveInstructions() {
      if (
        this.questions.infrontofmirror &&
        this.questions.roomlight &&
        this.questions.lensclean
      ) {
        this.$refs.nextbtn.style.visibility = "visible";
      } else {
        this.$refs.nextbtn.style.visibility = "hidden";
      }
    },
    getImage(name) {
      return window.localStorage.getItem(name);
    },
    gotoNext: function() {
      this.$refs.scrollContainer.scrollLeft =
        window.innerWidth * (this.curpage + 1);
    },
    sendToClinic: function() {
      window.localStorage.removeItem("eye_closed");
      window.localStorage.removeItem("eye_up");
      window.localStorage.removeItem("eye_down");
      window.localStorage.removeItem("eye_left");
      window.localStorage.removeItem("eye_right");
      window.localStorage.removeItem("eye_straight");
      this.gotoPage(9);
    },
    handleScroll: function() {
      //var curScroll = this.$refs.scrollContainer.scrollLeft;
      var cur = parseInt(
        (this.$refs.scrollContainer.scrollLeft + window.innerWidth / 2) /
          window.innerWidth
      );
      if (cur != this.curpage) {
        this.curpage = cur;
        // If the images are not uploaded yet and we are in one of those pages that needs validation then we won't be able to scroll
        if (
          (!this.imagesUploaded &&
            ((this.curpage === 1 &&
              !(
                this.questions.infrontofmirror &&
                this.questions.roomlight &&
                this.questions.lensclean
              )) ||
              this.curpage === 5)) ||
          // On pages 8 and 9 there shouldn't be a next sign
          this.curpage === 8 ||
          this.curpage === 9
        ) {
          this.$refs.nextbtn.style.visibility = "hidden";
          if (!this.$refs.scrollContainer.classList.contains("notscrollable")) {
            this.$refs.scrollContainer.classList += " notscrollable";
            this.$refs.scrollContainer.scrollLeft =
              window.innerWidth * this.curpage;
          }
        } else {
          this.$refs.nextbtn.style.visibility = "visible";
          if (this.$refs.scrollContainer.classList.contains("notscrollable")) {
            this.$refs.scrollContainer.classList.remove("notscrollable");
          }
        }
      }
    },
    gotoPage: function(i) {
      this.$refs.scrollContainer.scrollLeft = window.innerWidth * i;
    }
  }
};
</script>

<style src="./EyeCaptureIntro.scss" lang="scss" />
