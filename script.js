/****************************************************
 * AP SCANNER
 * FRONTEND
 *
 * OCR = EXACT GREEN FRAME
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
  document.getElementById(
    "video"
  );

const scanButton =
  document.getElementById(
    "scanButton"
  );

const resetButton =
  document.getElementById(
    "resetButton"
  );

const hasil =
  document.getElementById(
    "hasil"
  );

const vendorElement =
  document.getElementById(
    "vendor"
  );

const statusElement =
  document.getElementById(
    "status"
  );

const scanLabel =
  document.getElementById(
    "scanLabel"
  );


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
    return;
  }


  if (active) {

    loading.style.display =
      "flex";


    const loadingText =
      loading.querySelector(
        ".loading-text"
      );


    if (
      loadingText &&
      text
    ) {

      loadingText.textContent =
        text;

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
              ideal: 30
            }

          },

          audio: false

        });


    video.srcObject =
      stream;


    await video.play();


    console.log(
      "CAMERA READY:",
      video.videoWidth,
      "x",
      video.videoHeight
    );


  } catch (error) {

    console.error(
      "CAMERA ERROR:",
      error
    );


    alert(
      "Kamera tidak dapat digunakan."
    );

  }

}


/* ==================================================
   EXACT GREEN FRAME CROP
================================================== */

function captureCrop() {

  const video =
    document.getElementById(
      "video"
    );


  const frame =
    document.getElementById(
      "scanFrame"
    );


  if (
    !video ||
    !frame
  ) {

    console.error(
      "Video/frame tidak ditemukan"
    );

    return null;

  }


  const videoWidth =
    video.videoWidth;


  const videoHeight =
    video.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {

    console.error(
      "Video belum siap"
    );

    return null;

  }


  /*
   * =================================================
   * RECT VIDEO DI LAYAR
   * =================================================
   */

  const videoRect =
    video.getBoundingClientRect();


  /*
   * RECT FRAME HIJAU DI LAYAR
   */

  const frameRect =
    frame.getBoundingClientRect();


  /*
   * =================================================
   * HITUNG OBJECT-FIT: COVER
   * =================================================
   */

  const videoRatio =
    videoWidth /
    videoHeight;


  const displayWidth =
    videoRect.width;


  const displayHeight =
    videoRect.height;


  const displayRatio =
    displayWidth /
    displayHeight;


  let renderedWidth;

  let renderedHeight;

  let offsetX;

  let offsetY;


  if (
    videoRatio >
    displayRatio
  ) {

    /*
     * Video lebih lebar.
     * Sisi kiri/kanan terpotong.
     */

    renderedHeight =
      displayHeight;


    renderedWidth =
      renderedHeight *
      videoRatio;


    offsetX =
      (
        renderedWidth -
        displayWidth
      ) / 2;


    offsetY = 0;

  } else {

    /*
     * Video lebih tinggi.
     * Atas/bawah terpotong.
     */

    renderedWidth =
      displayWidth;


    renderedHeight =
      renderedWidth /
      videoRatio;


    offsetX = 0;


    offsetY =
      (
        renderedHeight -
        displayHeight
      ) / 2;

  }


  /*
   * =================================================
   * POSISI FRAME RELATIF VIDEO
   * =================================================
   */

  const frameLeft =
    frameRect.left -
    videoRect.left;


  const frameTop =
    frameRect.top -
    videoRect.top;


  /*
   * =================================================
   * KONVERSI FRAME → KOORDINAT VIDEO ASLI
   * =================================================
   */

  const sourceX =
    (
      frameLeft +
      offsetX
    ) /
    renderedWidth *
    videoWidth;


  const sourceY =
    (
      frameTop +
      offsetY
    ) /
    renderedHeight *
    videoHeight;


  const sourceWidth =
    frameRect.width /
    renderedWidth *
    videoWidth;


  const sourceHeight =
    frameRect.height /
    renderedHeight *
    videoHeight;


  /*
   * =================================================
   * CLAMP
   * =================================================
   */

  const sx =
    Math.max(
      0,
      Math.min(
        videoWidth - 1,
        Math.round(sourceX)
      )
    );


  const sy =
    Math.max(
      0,
      Math.min(
        videoHeight - 1,
        Math.round(sourceY)
      )
    );


  const sw =
    Math.max(
      1,
      Math.min(
        videoWidth - sx,
        Math.round(sourceWidth)
      )
    );


  const sh =
    Math.max(
      1,
      Math.min(
        videoHeight - sy,
        Math.round(sourceHeight)
      )
    );


  /*
   * =================================================
   * OUTPUT SIZE
   * =================================================
   *
   * 600px lebih aman untuk angka kecil.
   */

  const MAX_WIDTH = 600;


  let outputWidth =
    sw;


  let outputHeight =
    sh;


  if (
    outputWidth >
    MAX_WIDTH
  ) {

    const ratio =
      MAX_WIDTH /
      outputWidth;


    outputWidth =
      Math.round(
        outputWidth *
        ratio
      );


    outputHeight =
      Math.round(
        outputHeight *
        ratio
      );

  }


  /*
   * =================================================
   * CANVAS
   * =================================================
   */

  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    outputWidth;


  canvas.height =
    outputHeight;


  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );


  /*
   * =================================================
   * CROP
   *
   * HANYA AREA DALAM FRAME HIJAU
   * =================================================
   */

  ctx.drawImage(

    video,

    sx,
    sy,
    sw,
    sh,

    0,
    0,
    outputWidth,
    outputHeight

  );


  /*
   * =================================================
   * JPEG
   * =================================================
   */

  const imageData =
    canvas.toDataURL(
      "image/jpeg",
      0.50
    );


  /*
   * DEBUG
   */

  console.log(
    "========== EXACT OCR FRAME =========="
  );


  console.log(
    "Video asli:",
    videoWidth +
    " x " +
    videoHeight
  );


  console.log(
    "Frame layar:",
    Math.round(frameRect.width) +
    " x " +
    Math.round(frameRect.height)
  );


  console.log(
    "Crop video:",
    sx +
    ", " +
    sy +
    " / " +
    sw +
    " x " +
    sh
  );


  console.log(
    "Output OCR:",
    outputWidth +
    " x " +
    outputHeight
  );


  console.log(
    "Image size:",
    Math.round(
      imageData.length /
      1024
    ) +
    " KB"
  );


  console.log(
    "======================================"
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

  const start =
    performance.now();


  const response =
    await fetch(
      WEBAPP_URL,
      {

        method:
          "POST",

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


  const time =
    Math.round(
      performance.now() -
      start
    );


  console.log(
    "OCR TIME:",
    time + " ms"
  );


  console.log(
    "OCR RESULT:",
    result
  );


  return result;

}


/* ==================================================
   SCAN NUMBER
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
        "Gambar gagal diambil"
      );

    }


    const result =
      await sendOCR(
        image,
        "number"
      );


    /*
     * BERHASIL
     */

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


      currentStep = 2;


      if (scanLabel) {

        scanLabel.textContent =
          "ARAHKAN NAMA VENDOR KE SINI";

      }


      scanButton.textContent =
        "📷 SCAN VENDOR";


      setFrameVendor();


      updateSteps();


    } else {

      statusElement.textContent =
        "Nomor tidak terbaca — coba lagi";


      console.log(
        "OCR TEXT:",
        result.text
      );


      beepError();

    }


  } catch (error) {

    console.error(
      "SCAN NUMBER ERROR:",
      error
    );


    statusElement.textContent =
      "OCR gagal — coba lagi";

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
        "Gambar gagal diambil"
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


      await finalizeDocument();


    } else {

      statusElement.textContent =
        "Vendor tidak terbaca";


      beepError();

    }


  } catch (error) {

    console.error(
      "SCAN VENDOR ERROR:",
      error
    );


    statusElement.textContent =
      "OCR vendor gagal";

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

          method:
            "POST",

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
      "FINALIZE:",
      result
    );


    /*
     * DUPLICATE
     */

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


      updateSteps();


      return;

    }


    /*
     * BERHASIL
     */

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


      updateSteps();


      return;

    }


    statusElement.textContent =
      "Gagal menyimpan";

  } catch (error) {

    console.error(
      "FINALIZE ERROR:",
      error
    );


    statusElement.textContent =
      "Gagal menyimpan";

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

    frame.style.left =
      "8%";

    frame.style.right =
      "8%";

    frame.style.top =
      "42%";

    frame.style.height =
      "20%";

  }


  if (label) {

    label.textContent =
      "ARAHKAN NAMA VENDOR KE SINI";

  }

}


/* ==================================================
   UPDATE STEPS
================================================== */

function updateSteps() {

  const step1 =
    document.getElementById(
      "step1"
    );

  const step2 =
    document.getElementById(
      "step2"
    );

  const step3 =
    document.getElementById(
      "step3"
    );


  [
    step1,
    step2,
    step3
  ].forEach(
    function(step) {

      if (step) {

        step.classList.remove(
          "active",
          "done"
        );

      }

    }
  );


  if (
    currentStep === 1
  ) {

    if (step1) {

      step1.classList.add(
        "active"
      );

    }

  }


  if (
    currentStep === 2
  ) {

    if (step1) {

      step1.classList.add(
        "done"
      );

    }


    if (step2) {

      step2.classList.add(
        "active"
      );

    }

  }


  if (
    currentStep === 3
  ) {

    if (step1) {

      step1.classList.add(
        "done"
      );

    }


    if (step2) {

      step2.classList.add(
        "done"
      );

    }


    if (step3) {

      step3.classList.add(
        "active"
      );

    }

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


  if (scanButton) {

    scanButton.textContent =
      "📷 SCAN NOMOR AP";

  }


  setFrameNumber();

  updateSteps();

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
      "Beep unavailable"
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

  } catch (error) {}

}


/* ==================================================
   VIBRATE
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

      }

      else if (
        currentStep === 2
      ) {

        await scanVendor();

      }

      else {

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

    updateSteps();

    startCamera();

  }
);
