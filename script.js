/*************************************************
 * AP SCANNER
 * FRONTEND JAVASCRIPT
 *************************************************/


/*************************************************
 * GOOGLE APPS SCRIPT WEB APP
 *************************************************/
const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


/*************************************************
 * ELEMENT
 *************************************************/
const video =
  document.getElementById("video");

const scanButton =
  document.getElementById("scanButton");

const hasil =
  document.getElementById("hasil");

const vendorElement =
  document.getElementById("vendor");

const statusElement =
  document.getElementById("status");

const loading =
  document.getElementById("loading");

const scannedElement =
  document.getElementById("scanned");

const berhasilElement =
  document.getElementById("berhasil");

const duplikatElement =
  document.getElementById("duplikat");


/*************************************************
 * STAT
 *************************************************/
let scanned = 0;

let berhasil = 0;

let duplikat = 0;


/*************************************************
 * CAMERA
 *************************************************/
let stream = null;


/*************************************************
 * START CAMERA
 *************************************************/
async function startCamera() {

  try {

    stream =
      await navigator.mediaDevices
        .getUserMedia({

          video: {

            facingMode: {
              ideal: "environment"
            },

            width: {
              ideal: 1920
            },

            height: {
              ideal: 1080
            }
          },

          audio: false

        });


    video.srcObject =
      stream;


    await video.play();


    statusElement.textContent =
      "Kamera siap. Arahkan dokumen ke area scan.";

    statusElement.className =
      "status success";


  } catch (error) {

    console.error(error);


    statusElement.textContent =
      "Kamera tidak dapat digunakan: " +
      error.message;

    statusElement.className =
      "status error";
  }
}


/*************************************************
 * CAPTURE IMAGE
 *
 * Area diperbesar agar OCR tidak kehilangan
 * nomor dokumen.
 *************************************************/
function captureCrop() {

  const canvas =
    document.createElement("canvas");


  const videoWidth =
    video.videoWidth;


  const videoHeight =
    video.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {

    throw new Error(
      "Kamera belum siap"
    );
  }


  /***********************************************
   * AREA CROP
   *
   * X = 3%
   * Y = 12%
   * W = 94%
   * H = 76%
   ***********************************************/
  const x =
    Math.floor(
      videoWidth * 0.03
    );


  const y =
    Math.floor(
      videoHeight * 0.12
    );


  const width =
    Math.floor(
      videoWidth * 0.94
    );


  const height =
    Math.floor(
      videoHeight * 0.76
    );


  /***********************************************
   * BATAS RESOLUSI
   ***********************************************/
  const maxWidth = 1400;


  let outputWidth =
    width;


  let outputHeight =
    height;


  if (
    outputWidth > maxWidth
  ) {

    const ratio =
      maxWidth /
      outputWidth;


    outputWidth =
      maxWidth;


    outputHeight =
      Math.floor(
        outputHeight * ratio
      );
  }


  canvas.width =
    outputWidth;


  canvas.height =
    outputHeight;


  const ctx =
    canvas.getContext("2d");


  ctx.drawImage(

    video,

    x,
    y,
    width,
    height,

    0,
    0,
    outputWidth,
    outputHeight

  );


  /***********************************************
   * JPEG QUALITY 85%
   ***********************************************/
  const dataURL =
    canvas.toDataURL(
      "image/jpeg",
      0.85
    );


  /***********************************************
   * HAPUS PREFIX
   ***********************************************/
  return dataURL
    .replace(
      /^data:image\/jpeg;base64,/,
      ""
    );
}


/*************************************************
 * SCAN
 *************************************************/
async function scan() {

  if (
    !video.srcObject
  ) {

    statusElement.textContent =
      "Kamera belum aktif.";

    statusElement.className =
      "status error";

    return;
  }


  /***********************************************
   * BUTTON LOCK
   ***********************************************/
  scanButton.disabled =
    true;


  scanned++;


  updateStats();


  loading.style.display =
    "flex";


  hasil.textContent =
    "Membaca...";


  vendorElement.textContent =
    "-";


  statusElement.textContent =
    "Mengirim gambar ke OCR...";


  statusElement.className =
    "status";


  try {

    /*********************************************
     * CAPTURE
     *********************************************/
    const image =
      captureCrop();


    console.log(
      "Image captured"
    );


    /*********************************************
     * REQUEST
     *********************************************/
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
              image: image
            }),

          redirect: "follow"

        }
      );


    /*********************************************
     * RESPONSE TEXT
     *********************************************/
    const responseText =
      await response.text();


    console.log(
      "RAW RESPONSE:",
      responseText
    );


    let json;


    try {

      json =
        JSON.parse(
          responseText
        );

    } catch (error) {

      console.error(
        "JSON ERROR:",
        error
      );


      throw new Error(
        "Response server tidak valid"
      );
    }


    /*********************************************
     * RESPONSE GAGAL
     *********************************************/
    if (!json.success) {

      hasil.textContent =
        "-";


      vendorElement.textContent =
        json.vendor || "-";


      statusElement.textContent =
        json.message ||
        "Nomor dokumen tidak ditemukan";


      statusElement.className =
        "status error";


      /*******************************************
       * TAMPILKAN OCR DI CONSOLE
       *
       * Berguna untuk debugging
       *******************************************/
      if (json.ocr) {

        console.log(
          "========== OCR TEXT =========="
        );

        console.log(
          json.ocr
        );

        console.log(
          "=============================="
        );
      }


      return;
    }


    /*********************************************
     * HASIL
     *********************************************/
    hasil.textContent =
      json.nomor ||
      "-";


    vendorElement.textContent =
      json.vendor ||
      "-";


    /*********************************************
     * DUPLIKAT
     *********************************************/
    if (
      json.duplicate === true
    ) {

      duplikat++;


      statusElement.textContent =
        "⚠️ Nomor sudah pernah masuk filling";


      statusElement.className =
        "status warning";


    } else {

      berhasil++;


      statusElement.textContent =
        "✓ Berhasil masuk filling";


      statusElement.className =
        "status success";


      beep();


      vibrate();
    }


    updateStats();


  } catch (error) {

    console.error(
      error
    );


    hasil.textContent =
      "-";


    vendorElement.textContent =
      "-";


    statusElement.textContent =
      "Error: " +
      error.message;


    statusElement.className =
      "status error";


  } finally {

    loading.style.display =
      "none";


    scanButton.disabled =
      false;
  }
}


/*************************************************
 * UPDATE STAT
 *************************************************/
function updateStats() {

  scannedElement.textContent =
    scanned;


  berhasilElement.textContent =
    berhasil;


  duplikatElement.textContent =
    duplikat;
}


/*************************************************
 * BEEP
 *************************************************/
function beep() {

  try {

    const AudioContext =
      window.AudioContext ||
      window.webkitAudioContext;


    if (!AudioContext) {
      return;
    }


    const audioContext =
      new AudioContext();


    const oscillator =
      audioContext.createOscillator();


    const gain =
      audioContext.createGain();


    oscillator.connect(
      gain
    );


    gain.connect(
      audioContext.destination
    );


    oscillator.frequency.value =
      900;


    oscillator.type =
      "sine";


    gain.gain.setValueAtTime(
      0.15,
      audioContext.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.15
    );


    oscillator.start();


    oscillator.stop(
      audioContext.currentTime + 0.15
    );

  } catch (error) {

    console.log(
      "Beep tidak tersedia"
    );
  }
}


/*************************************************
 * VIBRATION
 *************************************************/
function vibrate() {

  if (
    navigator.vibrate
  ) {

    navigator.vibrate(
      100
    );
  }
}


/*************************************************
 * BUTTON
 *************************************************/
scanButton.addEventListener(
  "click",
  scan
);


/*************************************************
 * START
 *************************************************/
startCamera();
