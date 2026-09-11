/****************************************************
 * AP SCANNER
 * FRONTEND
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

const video = document.getElementById("video");
const scanButton = document.getElementById("scanButton");
const resetButton = document.getElementById("resetButton");
const hasil = document.getElementById("hasil");
const vendorElement = document.getElementById("vendor");
const statusElement = document.getElementById("status");
const scanLabel = document.getElementById("scanLabel");


/* ==================================================
   LOADING
================================================== */

function setLoading(active, text) {

  const loading = document.getElementById("loading");

  if (!loading) return;

  if (active) {

    loading.style.display = "flex";

    const loadingText =
      loading.querySelector(".loading-text");

    if (loadingText && text) {
      loadingText.textContent = text;
    }

  } else {

    loading.style.display = "none";

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
        .forEach(function(track) {
          track.stop();
        });

    }

    stream =
      await navigator.mediaDevices.getUserMedia({

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


    video.srcObject = stream;

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

function captureCrop(mode) {

  const video =
    document.getElementById("video");

  const frame =
    document.getElementById("scanFrame");

  if (!video || !frame) return null;


  const vw = video.videoWidth;
  const vh = video.videoHeight;


  if (!vw || !vh) return null;


  const vr =
    video.getBoundingClientRect();

  const fr =
    frame.getBoundingClientRect();


  /*
   * Video menggunakan object-fit: fill.
   * Mapping frame -> video linear.
   */

  let sx =
    Math.round(
      (fr.left - vr.left) /
      vr.width *
      vw
    );

  let sy =
    Math.round(
      (fr.top - vr.top) /
      vr.height *
      vh
    );

  let sw =
    Math.round(
      fr.width /
      vr.width *
      vw
    );

  let sh =
    Math.round(
      fr.height /
      vr.height *
      vh
    );


  sx =
    Math.max(
      0,
      Math.min(
        vw - 1,
        sx
      )
    );

  sy =
    Math.max(
      0,
      Math.min(
        vh - 1,
        sy
      )
    );

  sw =
    Math.max(
      1,
      Math.min(
        vw - sx,
        sw
      )
    );

  sh =
    Math.max(
      1,
      Math.min(
        vh - sy,
        sh
      )
    );


  /*
   * Nomor diperbesar lebih besar
   * agar karakter memiliki pixel lebih banyak.
   */

  const scale =
    mode === "number"
      ? 1.8
      : 1.25;


  const ow =
    Math.max(
      1,
      Math.round(sw * scale)
    );

  const oh =
    Math.max(
      1,
      Math.round(sh * scale)
    );


  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = ow;
  canvas.height = oh;


  const ctx =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );


  ctx.imageSmoothingEnabled = true;

  ctx.imageSmoothingQuality =
    "high";


  ctx.drawImage(
    video,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    ow,
    oh
  );


  /*
   * Khusus nomor AP:
   * grayscale + contrast ringan.
   */

  if (mode === "number") {

    const img =
      ctx.getImageData(
        0,
        0,
        ow,
        oh
      );

    const d =
      img.data;


    for (
      let i = 0;
      i < d.length;
      i += 4
    ) {

      const gray =
        0.299 * d[i] +
        0.587 * d[i + 1] +
        0.114 * d[i + 2];


      let v =
        (gray - 128) *
        1.35 +
        128;


      v =
        Math.max(
          0,
          Math.min(
            255,
            v
          )
        );


      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;

    }


    ctx.putImageData(
      img,
      0,
      0
    );

  }


  const imageData =
    canvas.toDataURL(
      "image/jpeg",
      mode === "number"
        ? 0.58
        : 0.50
    );


  console.log(
    "OCR CAPTURE",
    {
      mode: mode,

      video:
        vw + "x" + vh,

      crop:
        [sx, sy, sw, sh],

      output:
        [ow, oh],

      kb:
        Math.round(
          imageData.length / 1024
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


  if (!response.ok) {

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
      captureCrop(
        "number"
      );


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
      captureCrop(
        "vendor"
      );


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


    if (!response.ok) {

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
     * Jika backend lama masih mengembalikan
     * duplicate, tetap ditampilkan.
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
