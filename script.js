/****************************************************
 * AP SCANNER
 * FRONTEND
 *
 * FLOW:
 *
 * SCAN NOMOR AP
 *      ↓
 * SCAN VENDOR
 *      ↓
 * FINALIZE
 *      ↓
 * GOOGLE SHEET
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


/* ==================================================
   LOADING
================================================== */

function setLoading(active, text) {

  const loading =
    document.getElementById("loading");

  if (!loading) {
    return;
  }

  if (active) {

    loading.style.display = "flex";

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
   CAPTURE CROP
================================================== */

function captureCrop(mode) {

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


  const videoRect =
    video.getBoundingClientRect();

  const frameRect =
    frame.getBoundingClientRect();


  /*
   * VIDEO SEKARANG OBJECT-FIT: FILL
   *
   * Jadi koordinat layar
   * dapat dipetakan langsung
   * ke koordinat video asli.
   */

  const relativeLeft =
    frameRect.left -
    videoRect.left;

  const relativeTop =
    frameRect.top -
    videoRect.top;


  const scaleX =
    videoWidth /
    videoRect.width;

  const scaleY =
    videoHeight /
    videoRect.height;


  let sx =
    relativeLeft *
    scaleX;

  let sy =
    relativeTop *
    scaleY;

  let sw =
    frameRect.width *
    scaleX;

  let sh =
    frameRect.height *
    scaleY;


  /*
   * ZOOM CROP
   *
   * Nomor AP dibuat lebih besar
   * agar OCR lebih mudah membaca.
   */

  const zoom =
    mode === "number"
      ? 1.8
      : 1.25;


  const centerX =
    sx + sw / 2;

  const centerY =
    sy + sh / 2;


  sw =
    sw / zoom;

  sh =
    sh / zoom;


  sx =
    centerX - sw / 2;

  sy =
    centerY - sh / 2;


  /*
   * CLAMP
   */

  sx =
    Math.max(
      0,
      Math.min(
        videoWidth - 1,
        sx
      )
    );

  sy =
    Math.max(
      0,
      Math.min(
        videoHeight - 1,
        sy
      )
    );

  sw =
    Math.min(
      sw,
      videoWidth - sx
    );

  sh =
    Math.min(
      sh,
      videoHeight - sy
    );


  /*
   * OUTPUT
   */

  const MAX_WIDTH = 600;


  let outputWidth =
    Math.round(sw);

  let outputHeight =
    Math.round(sh);


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
   * CANVAS
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
   * CROP
   */

  ctx.drawImage(

    video,

    Math.round(sx),
    Math.round(sy),

    Math.round(sw),
    Math.round(sh),

    0,
    0,

    outputWidth,
    outputHeight
  );


  /*
   * NUMBER:
   * GRAYSCALE + CONTRAST
   */

  if (
    mode === "number"
  ) {

    const image =
      ctx.getImageData(
        0,
        0,
        outputWidth,
        outputHeight
      );

    const data =
      image.data;


    const contrast =
      1.35;

    const factor =
      (259 * (contrast + 255)) /
      (255 * (259 - contrast));


    for (
      let i = 0;
      i < data.length;
      i += 4
    ) {

      const gray =
        0.299 * data[i] +
        0.587 * data[i + 1] +
        0.114 * data[i + 2];


      let value =
        factor *
          (gray - 128) +
        128;


      value =
        Math.max(
          0,
          Math.min(
            255,
            value
          )
        );


      data[i] =
        value;

      data[i + 1] =
        value;

      data[i + 2] =
        value;
    }


    ctx.putImageData(
      image,
      0,
      0
    );
  }


  /*
   * JPEG
   */

  const quality =
    mode === "number"
      ? 0.58
      : 0.50;


  const imageData =
    canvas.toDataURL(
      "image/jpeg",
      quality
    );


  /*
   * DEBUG
   */

  console.log(
    "========== OCR CROP =========="
  );

  console.log(
    "MODE:",
    mode
  );

  console.log(
    "VIDEO:",
    videoWidth,
    "x",
    videoHeight
  );

  console.log(
    "FRAME:",
    Math.round(
      frameRect.width
    ),
    "x",
    Math.round(
      frameRect.height
    )
  );

  console.log(
    "CROP:",
    Math.round(sx),
    Math.round(sy),
    Math.round(sw),
    Math.round(sh)
  );

  console.log(
    "OUTPUT:",
    outputWidth,
    "x",
    outputHeight
  );

  console.log(
    "IMAGE:",
    Math.round(
      imageData.length /
      1024
    ),
    "KB"
  );

  console.log(
    "=============================="
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

    setLoading(false);
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

    setLoading(false);
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

    setLoading(false);
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

    /*
     * FINAL
     */

    frame.style.left =
      "7%";

    frame.style.right =
      "7%";

    frame.style.top =
      "36%";

    frame.style.height =
      "28%";
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

function updateStats(type) {

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
