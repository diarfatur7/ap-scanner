/****************************************************
 * AP SCANNER - SPEED OCR
 * Frontend
 ****************************************************/


/* ==================================================
   CONFIG
================================================== */

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


let stream = null;

let currentStep = 1;

let nomorDokumen = "";

let vendor = "";


/* ==================================================
   DOM
================================================== */

const video =
  document.getElementById("video");

const scanButton =
  document.getElementById("scanButton");

const resetButton =
  document.getElementById("resetButton");

const hasil =
  document.getElementById("hasil");

const vendorElement =
  document.getElementById("vendor");

const statusElement =
  document.getElementById("status");

const scanLabel =
  document.getElementById("scanLabel");

const stepTitle =
  document.getElementById("stepTitle");


/* ==================================================
   LOADING
================================================== */

function setLoading(
  active,
  text
) {

  const loading =
    document.getElementById(
      "loading"
    );


  if (!loading) {

    console.log(
      "Loading element tidak ditemukan"
    );

    return;

  }


  if (active) {

    loading.style.display =
      "flex";


    if (text) {

      const loadingText =
        loading.querySelector(
          ".loading-text"
        );


      if (loadingText) {

        loadingText.textContent =
          text;

      }

    }

  } else {

    loading.style.display =
      "none";

  }

}


/* ==================================================
   CAMERA
================================================== */

async function startCamera() {

  try {

    if (stream) {

      stream
        .getTracks()
        .forEach(
          function(track) {

            track.stop();

          }
        );

    }


    stream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode: {
              ideal: "environment"
            },

            width: {
              ideal: 640
            },

            height: {
              ideal: 480
            },

            frameRate: {
              ideal: 30,
              max: 30
            }

          },

          audio: false

        });


    video.srcObject =
      stream;


    await video.play();


    console.log(
      "Camera:",
      video.videoWidth,
      "x",
      video.videoHeight
    );


  } catch (error) {

    console.error(
      "Camera error:",
      error
    );


    alert(
      "Kamera tidak dapat digunakan."
    );

  }

}


/* ==================================================
   CAPTURE EXACT GREEN FRAME
================================================== */

function captureCrop() {

  const video =
    document.getElementById(
      "video"
    );


  const scanner =
    document.querySelector(
      ".scanner-card"
    );


  const frame =
    document.getElementById(
      "scanFrame"
    );


  if (
    !video ||
    !scanner ||
    !frame
  ) {

    console.error(
      "Video / scanner / frame tidak ditemukan"
    );

    return null;

  }


  const vw =
    video.videoWidth;


  const vh =
    video.videoHeight;


  if (
    !vw ||
    !vh
  ) {

    console.error(
      "Resolusi kamera belum tersedia"
    );

    return null;

  }


  const scannerRect =
    scanner.getBoundingClientRect();


  const frameRect =
    frame.getBoundingClientRect();


  const scannerW =
    scannerRect.width;


  const scannerH =
    scannerRect.height;


  const videoRatio =
    vw / vh;


  const scannerRatio =
    scannerW / scannerH;


  let renderedW;

  let renderedH;

  let offsetX;

  let offsetY;


  /*
   * object-fit: cover
   */

  if (
    videoRatio > scannerRatio
  ) {

    renderedH =
      scannerH;


    renderedW =
      renderedH *
      videoRatio;


    offsetX =
      (
        renderedW -
        scannerW
      ) / 2;


    offsetY = 0;

  } else {

    renderedW =
      scannerW;


    renderedH =
      renderedW /
      videoRatio;


    offsetX = 0;


    offsetY =
      (
        renderedH -
        scannerH
      ) / 2;

  }


  /*
   * Posisi frame
   */

  const frameX =
    frameRect.left -
    scannerRect.left;


  const frameY =
    frameRect.top -
    scannerRect.top;


  /*
   * Konversi posisi layar
   * menjadi koordinat video
   */

  const sourceX =
    (
      frameX +
      offsetX
    ) /
    renderedW *
    vw;


  const sourceY =
    (
      frameY +
      offsetY
    ) /
    renderedH *
    vh;


  const sourceW =
    frameRect.width /
    renderedW *
    vw;


  const sourceH =
    frameRect.height /
    renderedH *
    vh;


  /*
   * Clamp
   */

  const sx =
    Math.max(
      0,
      Math.round(sourceX)
    );


  const sy =
    Math.max(
      0,
      Math.round(sourceY)
    );


  const sw =
    Math.min(
      Math.round(sourceW),
      vw - sx
    );


  const sh =
    Math.min(
      Math.round(sourceH),
      vh - sy
    );


  /*
   * Resize
   */

  const MAX_WIDTH = 420;


  let outputW =
    sw;


  let outputH =
    sh;


  if (
    outputW >
    MAX_WIDTH
  ) {

    const ratio =
      MAX_WIDTH /
      outputW;


    outputW =
      Math.round(
        outputW *
        ratio
      );


    outputH =
      Math.round(
        outputH *
        ratio
      );

  }


  /*
   * Canvas
   */

  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    outputW;


  canvas.height =
    outputH;


  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: false,
        willReadFrequently: false
      }
    );


  /*
   * Crop EXACT frame hijau
   */

  ctx.drawImage(

    video,

    sx,
    sy,
    sw,
    sh,

    0,
    0,
    outputW,
    outputH

  );


  /*
   * JPEG quality 30%
   */

  const imageData =
    canvas.toDataURL(
      "image/jpeg",
      0.30
    );


  console.log(
    "OCR crop:",
    {
      video:
        `${vw}x${vh}`,

      source:
        `${sw}x${sh}`,

      output:
        `${outputW}x${outputH}`,

      sizeKB:
        Math.round(
          imageData.length /
          1024
        )
    }
  );


  return imageData;

}


/* ==================================================
   SEND OCR
================================================== */

async function sendOCR(
  image,
  mode
) {

  try {

    const response =
      await fetch(
        WEBAPP_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              mode:
                mode,

              image:
                image

            })

        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const result =
      await response.json();


    console.log(
      "OCR result:",
      result
    );


    return result;


  } catch (error) {

    console.error(
      "OCR error:",
      error
    );


    throw error;

  }

}


/* ==================================================
   SCAN NOMOR
================================================== */

async function scanNomor() {

  try {

    setLoading(
      true,
      "Membaca nomor AP..."
    );


    const image =
      captureCrop();


    if (!image) {

      throw new Error(
        "Gagal mengambil gambar"
      );

    }


    const result =
      await sendOCR(
        image,
        "number"
      );


    if (
      result.success &&
      result.nomorDokumen
    ) {

      nomorDokumen =
        result.nomorDokumen;


      hasil.textContent =
        nomorDokumen;


      statusElement.textContent =
        "Nomor berhasil dibaca";


      updateStats(
        "scanned"
      );


      beep();

      vibrate();


      /*
       * STEP 2
       */

      currentStep = 2;


      if (stepTitle) {

        stepTitle.textContent =
          "Scan Vendor";

      }


      if (scanLabel) {

        scanLabel.textContent =
          "ARAHKAN NAMA VENDOR KE SINI";

      }


      scanButton.textContent =
        "📷 SCAN VENDOR";


      setFrameVendor();


    } else {

      statusElement.textContent =
        "Nomor tidak terbaca. Coba lagi.";


      beepError();

    }


  } catch (error) {

    console.error(
      error
    );


    statusElement.textContent =
      "OCR gagal. Coba lagi.";

  } finally {

    setLoading(
      false
    );

  }

}


/* ==================================================
   SCAN VENDOR
================================================== */

async function scanVendor() {

  try {

    setLoading(
      true,
      "Membaca vendor..."
    );


    const image =
      captureCrop();


    if (!image) {

      throw new Error(
        "Gagal mengambil gambar"
      );

    }


    const result =
      await sendOCR(
        image,
        "vendor"
      );


    if (
      result.success &&
      result.vendor
    ) {

      vendor =
        result.vendor;


      vendorElement.textContent =
        vendor;


      statusElement.textContent =
        "Vendor berhasil dibaca";


      beep();

      vibrate();


      /*
       * Langsung finalize
       */

      await finalizeDocument();


    } else {

      statusElement.textContent =
        "Vendor tidak terbaca. Coba lagi.";


      beepError();

    }


  } catch (error) {

    console.error(
      error
    );


    statusElement.textContent =
      "OCR vendor gagal.";

  } finally {

    setLoading(
      false
    );

  }

}


/* ==================================================
   FINALIZE
================================================== */

async function finalizeDocument() {

  try {

    setLoading(
      true,
      "Menyimpan dokumen..."
    );


    const response =
      await fetch(
        WEBAPP_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "finalize",

              nomorDokumen:
                nomorDokumen,

              vendor:
                vendor

            })

        }
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "HTTP " +
        response.status
      );

    }


    const result =
      await response.json();


    console.log(
      "Finalize:",
      result
    );


    if (
      result.duplicate
    ) {

      statusElement.textContent =
        "⚠️ DOKUMEN SUDAH ADA";


      updateStats(
        "duplicate"
      );


      currentStep = 3;


      scanButton.textContent =
        "📷 SCAN DOKUMEN BARU";


      setFrameNumber();


      return;

    }


    if (
      result.success
    ) {

      statusElement.textContent =
        "✅ SUDAH MASUK FILLING";


      updateStats(
        "berhasil"
      );


      currentStep = 3;


      scanButton.textContent =
        "📷 SCAN DOKUMEN BARU";


      setFrameNumber();


      return;

    }


    statusElement.textContent =
      "Gagal menyimpan dokumen.";

  } catch (error) {

    console.error(
      "Finalize error:",
      error
    );


    statusElement.textContent =
      "Gagal menyimpan.";

  } finally {

    setLoading(
      false
    );

  }

}


/* ==================================================
   FRAME NOMOR
================================================== */

function setFrameNumber() {

  const frame =
    document.getElementById(
      "scanFrame"
    );


  const label =
    document.getElementById(
      "scanLabel"
    );


  if (frame) {

    frame.style.left =
      "17%";

    frame.style.right =
      "17%";

    frame.style.top =
      "38%";

    frame.style.height =
      "18%";

  }


  if (label) {

    label.textContent =
      "ARAHKAN NOMOR AP KE SINI";

  }

}


/* ==================================================
   FRAME VENDOR
================================================== */

function setFrameVendor() {

  const frame =
    document.getElementById(
      "scanFrame"
    );


  const label =
    document.getElementById(
      "scanLabel"
    );


  if (frame) {

    /*
     * Vendor biasanya berada
     * di area lebih lebar.
     */

    frame.style.left =
      "10%";

    frame.style.right =
      "10%";

    frame.style.top =
      "43%";

    frame.style.height =
      "20%";

  }


  if (label) {

    label.textContent =
      "ARAHKAN NAMA VENDOR KE SINI";

  }

}


/* ==================================================
   RESET
================================================== */

function resetScanner() {

  nomorDokumen = "";

  vendor = "";

  currentStep = 1;


  if (hasil) {

    hasil.textContent =
      "-";

  }


  if (vendorElement) {

    vendorElement.textContent =
      "-";

  }


  if (statusElement) {

    statusElement.textContent =
      "Siap scan";

  }


  if (stepTitle) {

    stepTitle.textContent =
      "Scan Nomor AP";

  }


  if (scanButton) {

    scanButton.textContent =
      "📷 SCAN NOMOR AP";

  }


  setFrameNumber();

}


/* ==================================================
   STATS
================================================== */

function updateStats(
  type
) {

  const element =
    document.getElementById(
      type
    );


  if (!element) {
    return;
  }


  const current =
    parseInt(
      element.textContent ||
      "0",
      10
    );


  element.textContent =
    current + 1;

}


/* ==================================================
   BEEP
================================================== */

function beep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) {
      return;
    }


    const audio =
      new AudioContext();


    const oscillator =
      audio.createOscillator();


    const gain =
      audio.createGain();


    oscillator.frequency.value =
      900;


    gain.gain.value =
      0.08;


    oscillator.connect(
      gain
    );


    gain.connect(
      audio.destination
    );


    oscillator.start();


    oscillator.stop(
      audio.currentTime +
      0.08
    );

  } catch (error) {

    console.log(
      "Beep tidak tersedia"
    );

  }

}


/* ==================================================
   ERROR BEEP
================================================== */

function beepError() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) {
      return;
    }


    const audio =
      new AudioContext();


    const oscillator =
      audio.createOscillator();


    const gain =
      audio.createGain();


    oscillator.frequency.value =
      300;


    gain.gain.value =
      0.08;


    oscillator.connect(
      gain
    );


    gain.connect(
      audio.destination
    );


    oscillator.start();


    oscillator.stop(
      audio.currentTime +
      0.15
    );

  } catch (error) {

    console.log(
      "Error beep tidak tersedia"
    );

  }

}


/* ==================================================
   VIBRATION
================================================== */

function vibrate() {

  if (
    navigator.vibrate
  ) {

    navigator.vibrate(
      80
    );

  }

}


/* ==================================================
   BUTTON
================================================== */

if (scanButton) {

  scanButton.addEventListener(
    "click",
    async function() {

      if (
        currentStep === 1
      ) {

        await scanNomor();

      } else if (
        currentStep === 2
      ) {

        await scanVendor();

      } else {

        resetScanner();

      }

    }
  );

}


if (resetButton) {

  resetButton.addEventListener(
    "click",
    function() {

      resetScanner();

    }
  );

}


/* ==================================================
   INIT
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  function() {

    setFrameNumber();

    startCamera();

  }
);
