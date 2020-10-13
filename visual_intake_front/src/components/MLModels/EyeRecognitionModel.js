// import * as tfconv from '@tensorflow/tfjs-converter';
// import * as tf from '@tensorflow/tfjs-core';

const IMAGE_SIZE = 224;

export default class EyeRecognitionModel {
  // Values read from images are in the range [0.0, 255.0], but they must
  // be normalized to [min, max] before passing to the classifier.
  // Different implementations of mobilenet have different values of [min, max].
  // We store the appropriate normalization parameters using these two scalars
  // such that:
  // out = (in / 255.0) * (inputMax - inputMin) + inputMin;

  constructor(modelUrl, inputMin = -1, inputMax = 1) {
    this.inputMin = inputMin;
    this.inputMax = inputMax;
    this.normalizationConstant = (inputMax - inputMin) / IMAGE_SIZE;
    this.modelUrl = modelUrl;
    this.loadedSuccess = false;
  }

  async load() {
    // Expect that models loaded by URL should be normalized to [-1, 1]
    this.model = await window.tf.loadGraphModel(this.modelUrl);

    // Warmup the model.
    const result = this.model.predict(
      window.tf.zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3])
    );
    await result[1].arraySync();
    result[0].dispose();
    result[1].dispose();
    this.loadedSuccess = true;
    console.log("EyeRecognitionModel Loaded Successfully");
  }

  isLoaded() {
    return this.loadedSuccess;
  }

  /**
   * Computes the logits (or the embedding) for the provided image.
   *
   * @param img The image to classify. Can be a tensor or a DOM element image,
   *     video, or canvas.
   */
  async predict(
    img //tf.Tensor|ImageData|HTMLImageElement|HTMLCanvasElement|)
  ) {
    var imgWidth = img.width;
    var imgHeight = img.height;
    // Wrapping with tf.tidy for better memory management
    var [score, landmarks, bounding_box] = await window.tf.tidy(() => {
      if (!(img instanceof window.tf.Tensor)) {
        img = window.tf.browser.fromPixels(img);
      }

      // Normalize the image from [0, 255] to [inputMin, inputMax].
      const normalized = img
        .toFloat()
        .mul(this.normalizationConstant)
        .sub(this.inputMax);

      // Resize the image to
      let resized = normalized;
      if (img.shape[0] !== IMAGE_SIZE || img.shape[1] !== IMAGE_SIZE) {
        const alignCorners = true;
        resized = window.tf.image.resizeBilinear(
          normalized,
          [IMAGE_SIZE, IMAGE_SIZE],
          alignCorners
        );
      }

      // Reshape so we can pass it to predict.
      const batched = resized.reshape([-1, IMAGE_SIZE, IMAGE_SIZE, 3]);

      var result = this.model.predict(batched);
      if (result[2]) {
        for (var i = 0; i <= 2; i += 1) {
          if (result[i].size == 1) {
            // Score
            var score = result[i];
          }
          if (result[i].size == 4) {
            // Bounding Box
            var bounding_box = result[i].reshape([2, 2]);
            //.add(this.inputMax)
            //.div(this.normalizationConstant);
          }
          if (result[i].size == 40) {
            // Landmarks
            var landmarks = result[i].reshape([20, 2]);
            //.add(this.inputMax)
            //.div(this.normalizationConstant);
          }
        }

        return [score, landmarks, bounding_box];
      }
      return [0, null, null];
    });

    if (score) {
      var scaledLandmarks = this.scalePointsBack(
        landmarks.arraySync(),
        imgWidth,
        imgHeight
      );
      var scaledBoundingBox = this.scalePointsBack(
        bounding_box.arraySync(),
        imgWidth,
        imgHeight
      );
      var isEyeScore = score.arraySync();
      score.dispose();
      landmarks.dispose();
      bounding_box.dispose();
      return [isEyeScore, scaledLandmarks, scaledBoundingBox];
    }
    return [0, null, null];
  }

  scalePointsBack(predictions, originWidth, originHeight) {
    return predictions.map(point => [
      point[0] * originWidth, /// IMAGE_SIZE,
      point[1] * originHeight /// IMAGE_SIZE
    ]);
  }

  getMeanPoint(predictions) {
    var sum = predictions.reduce((prev, curr) => [
      prev[0] + curr[0],
      prev[1] + curr[1]
    ]);
    return [sum[0] / predictions.length, sum[1] / predictions.length];
  }

  dispose() {
    if (this.model != null) {
      this.model.dispose();
    }
  }
}
