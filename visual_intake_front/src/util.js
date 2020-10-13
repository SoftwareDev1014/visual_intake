const color = "aqua";
const lineWidth = 2;

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isiOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isWebglSupport () { 
  try {
   var canvas = document.createElement('canvas'); 
   return !!window.WebGLRenderingContext &&
     (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch(e) {
    return false;
  }
};

export function isMobile() {
  return isAndroid() || isiOS();
}

export function sleep(ms = 0) {
  return new Promise(r => setTimeout(r, ms));
}

export function cropCanvas(sourceCanvas, left, top, width, height) {
  let destCanvas = document.createElement("canvas");
  destCanvas.width = width;
  destCanvas.height = height;
  destCanvas.getContext("2d").drawImage(
    sourceCanvas,
    left,
    top,
    width,
    height, // source rect with content to crop
    0,
    0,
    width,
    height
  ); // newCanvas, same size as source rect
  return destCanvas;
}

export function contains(rect, point) {
  return (
    rect.x <= point.x &&
    point.x <= rect.x + rect.width &&
    rect.y <= point.y &&
    point.y <= rect.y + rect.height
  );
}

export function drawPoint(ctx, y, x, r, color, isFilled = true) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  if (isFilled) {
    ctx.fill();
  } else {
    ctx.stroke();
  }
}

export function mirrorImage(
  ctx,
  image,
  x = 0,
  y = 0,
  horizontal = false,
  vertical = false
) {
  ctx.setTransform(
    horizontal ? -1 : 1,
    0, // set the direction of x axis
    0,
    vertical ? -1 : 1, // set the direction of y axis
    x + horizontal ? image.width : 0, // set the x origin
    y + vertical ? image.height : 0 // set the y origin
  );
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
export function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function drawRectangle(ctx, x, y, width, height) {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.stroke();
}

/**
 * Draw pose keypoints onto a canvas
 */
export function drawKeypoints(
  keypoints,
  minConfidence,
  ctx,
  scale = 1,
  radius = 3
) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const { y, x } = keypoint.position;
    drawPoint(ctx, y * scale, x * scale, radius, color);
  }
}

/**
 * Converts an arary of pixel data into an ImageData object
 */
export async function renderToCanvas(a, ctx) {
  const [height, width] = a.shape;
  const imageData = new ImageData(width, height);

  const data = await a.data();

  for (let i = 0; i < height * width; ++i) {
    const j = i * 4;
    const k = i * 3;

    imageData.data[j + 0] = data[k + 0];
    imageData.data[j + 1] = data[k + 1];
    imageData.data[j + 2] = data[k + 2];
    imageData.data[j + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw an image on a canvas
 */
export function renderImageToCanvas(image, size, canvas) {
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext("2d");

  ctx.drawImage(image, 0, 0);
}
