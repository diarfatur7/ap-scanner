/*************************************************
 * AP SCANNER 2X
 *************************************************/


const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


/*************************************************
 * ELEMENT
 *************************************************/

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

const loading =
  document.getElementById(
    "loading"
  );

const stepTitle =
  document.getElementById(
    "stepTitle"
  );

const stepDescription =
  document.getElementById(
    "stepDescription"
  );

const scanLabel =
  document.getElementById(
    "scanLabel"
  );

const scannedElement =
  document.getElementById(
    "scanned"
  );

const berhasilElement =
  document.getElementById(
    "berhasil"
  );

const duplikatElement =
  document.getElementById(
    "duplikat"
  );


/*************************************************
 * STATE
 *************************************************/

/*
 * 1 = scan nomor
 * 2 = scan vendor
 * 3 = selesai
 */

let currentStep = 1;


/*
 * Hasil scan pertama
 */
let nomorDokumen = "";


/*
 * Hasil scan kedua
 */
let vendor = "";


/*
 * Statistik
 */
let scanned = 0;

let berhasil = 0;

let duplikat = 0;


/*
 * Camera
 */
let stream = null;


/*************************************************
 * START CAMERA
 *************************************************/

async function startCamera() {

  try {

    stream =
      await navigator
        .mediaDevices
        .getUserMedia({

          video: {

            facingMode: {
              ideal:
                "environment"
            },

            width: {
              ideal:
                1920
            },

            height: {
              ideal:
                1080
            }

          },

          audio:
            false

        });


    video.srcObject =
      stream;


    await video.play();


    statusElement.textContent =
      "Kamera siap.";

    statusElement.className =
      "status success";


  } catch (error) {

    console.error(
      error
    );


    statusElement.textContent =
      "Kamera tidak dapat digunakan: " +
      error.message;

    statusElement.className =
      "status error";

  }

}


/*************************************************
 * CAPTURE
 *************************************************/

function captureCrop() {

  const canvas =
    document.createElement(
      "canvas"
    );


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


  /*
   * Ambil hampir seluruh area
   */
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


  const maxWidth =
    1400;


  let outputWidth =
    width;


  let outputHeight =
    height;


  if (
    outputWidth >
    maxWidth
  ) {

    const ratio =
      maxWidth /
      outputWidth;


    outputWidth =
      maxWidth;


    outputHeight =
      Math.floor(
        outputHeight *
        ratio
      );

  }


  canvas.width =
    outputWidth;


  canvas.height =
    outputHeight;


  const ctx =
    canvas.getContext(
      "2d"
    );


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


  return canvas
    .toDataURL(
      "image/jpeg",
      0.85
    )
    .replace(
      /^data:image\/jpeg;base64,/,
      ""
    );

}


/*************************************************
 * SEND OCR
 *************************************************/

async function sendOCR(
  image,
  mode
) {

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

            image:
              image,

            mode:
              mode

          }),

        redirect:
          "follow"

      }
    );


  const responseText =
    await response.text();


  console.log(
    "SERVER RESPONSE:",
    responseText
  );


  let json;


  try {

    json =
      JSON.parse(
        responseText
      );

  } catch (error) {

    throw new Error(
      "Response server tidak valid"
    );

  }


  return json;

}


/*************************************************
 * SCAN BUTTON
 *************************************************/

async function scan() {

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

}


/*************************************************
 * SCAN NOMOR
 *************************************************/

async function scanNomor() {

  scanButton.disabled =
    true;


  scanned++;


  updateStats();


  loading.style.display =
    "flex";


  hasil.textContent =
    "Membaca...";


  statusElement.textContent =
    "Membaca nomor dokumen...";


  statusElement.className =
    "status";


  try {

    const image =
      captureCrop();


    const json =
      await sendOCR(
        image,
        "number"
      );


    console.log(
      "OCR NOMOR:",
      json.ocr
    );


    if (
      !json.success ||
      !json.nomor
    ) {

      hasil.textContent =
        "-";


      statusElement.textContent =
        json.message ||
        "Nomor dokumen tidak ditemukan";


      statusElement.className =
        "status error";


      return;

    }


    /*******************************************
     * SIMPAN NOMOR
     *******************************************/
    nomorDokumen =
      json.nomor;


    hasil.textContent =
      nomorDokumen;


    statusElement.textContent =
      "✓ Nomor ditemukan. Sekarang scan vendor.";


    statusElement.className =
      "status success";


    /*******************************************
     * PINDAH KE STEP 2
     *******************************************/
    currentStep =
      2;


    stepTitle.textContent =
      "SCAN 2 — VENDOR";


    stepDescription.textContent =
      "Sekarang arahkan kamera ke nama vendor";


    scanLabel.textContent =
      "ARAHKAN VENDOR KE SINI";


    scanButton.textContent =
      "📷 SCAN VENDOR";


    beep();


    vibrate();


  } catch (error) {

    console.error(
      error
    );


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
 * SCAN VENDOR
 *************************************************/

async function scanVendor() {

  scanButton.disabled =
    true;


  scanned++;


  updateStats();


  loading.style.display =
    "flex";


  vendorElement.textContent =
    "Membaca...";


  statusElement.textContent =
    "Membaca nama vendor...";


  statusElement.className =
    "status";


  try {

    const image =
      captureCrop();


    const json =
      await sendOCR(
        image,
        "vendor"
      );


    console.log(
      "OCR VENDOR:",
      json.ocr
    );


    if (
      !json.success ||
      !json.vendor
    ) {

      vendorElement.textContent =
        "-";


      statusElement.textContent =
        json.message ||
        "Vendor tidak ditemukan";


      statusElement.className =
        "status error";


      return;

    }


    /*******************************************
     * SIMPAN VENDOR
     *******************************************/
    vendor =
      json.vendor;


    vendorElement.textContent =
      vendor;


    /*******************************************
     * FINALIZE
     *******************************************/
    statusElement.textContent =
      "Menyimpan data...";


    const result =
      await finalize();


    if (
      !result.success
    ) {

      statusElement.textContent =
        result.message;


      statusElement.className =
        "status error";


      return;

    }


    /*******************************************
     * DUPLIKAT
     *******************************************/
    if (
      result.duplicate === true
    ) {

      duplikat++;


      statusElement.textContent =
        "⚠️ Nomor sudah pernah masuk filling";


      statusElement.className =
        "status warning";


    } else {

      berhasil++;


      statusElement.textContent =
        "✓ BERHASIL MASUK FILLING";


      statusElement.className =
        "status success";


      beep();


      vibrate();

    }


    updateStats();


    /*******************************************
     * SELESAI
     *******************************************/
    currentStep =
      3;


    stepTitle.textContent =
      "✓ DOKUMEN SELESAI";


    stepDescription.textContent =
      "Nomor dan vendor sudah diproses";


    scanLabel.textContent =
      "SELESAI";


    scanButton.style.display =
      "none";


    resetButton.style.display =
      "block";


  } catch (error) {

    console.error(
      error
    );


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
 * FINALIZE
 *
 * Simpan nomor + vendor
 *************************************************/

async function finalize() {

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

          }),

        redirect:
          "follow"

      }
    );


  const text =
    await response.text();


  console.log(
    "FINAL RESPONSE:",
    text
  );


  let json;


  try {

    json =
      JSON.parse(
        text
      );

  } catch (error) {

    throw new Error(
      "Response finalize tidak valid"
    );

  }


  return json;

}


/*************************************************
 * RESET
 *************************************************/

function resetScanner() {

  currentStep =
    1;


  nomorDokumen =
    "";


  vendor =
    "";


  hasil.textContent =
    "-";


  vendorElement.textContent =
    "-";


  statusElement.textContent =
    "Siap melakukan scan";


  statusElement.className =
    "status";


  stepTitle.textContent =
    "SCAN 1 — NOMOR DOKUMEN";


  stepDescription.textContent =
    "Arahkan kamera ke nomor AP / nomor dokumen";


  scanLabel.textContent =
    "ARAHKAN NOMOR KE SINI";


  scanButton.textContent =
    "📷 SCAN NOMOR";


  scanButton.style.display =
    "block";


  resetButton.style.display =
    "none";

}


/*************************************************
 * STATS
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


    const audio =
      new AudioContext();


    const oscillator =
      audio.createOscillator();


    const gain =
      audio.createGain();


    oscillator.connect(
      gain
    );


    gain.connect(
      audio.destination
    );


    oscillator.frequency.value =
      900;


    oscillator.type =
      "sine";


    gain.gain.setValueAtTime(
      0.15,
      audio.currentTime
    );


    gain.gain.exponentialRampToValueAtTime(
      0.001,
      audio.currentTime + 0.15
    );


    oscillator.start();


    oscillator.stop(
      audio.currentTime + 0.15
    );

  } catch (error) {

    console.log(
      "Beep unavailable"
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
 * EVENT
 *************************************************/

scanButton.addEventListener(
  "click",
  scan
);


resetButton.addEventListener(
  "click",
  resetScanner
);


/*************************************************
 * START
 *************************************************/

startCamera();
