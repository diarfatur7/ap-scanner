/*************************************************
 * AP SCANNER FAST 2X SCAN
 * FRONTEND - GITHUB PAGES
 *
 * SCAN 1 = NOMOR DOKUMEN
 * SCAN 2 = VENDOR
 *
 * MODE FAST:
 * CAMERA 640x480
 * OUTPUT MAX 500px
 * JPEG QUALITY 35%
 *************************************************/


/*************************************************
 * CONFIG
 *************************************************/

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


console.log(
  "AP SCANNER FAST 2X VERSION 4 AKTIF"
);


/*************************************************
 * ELEMENT
 *************************************************/

const video =
  document.getElementById("video");

const canvas =
  document.createElement("canvas");


/*************************************************
 * STATE
 *************************************************/

let currentStep = 1;

let nomorDokumen = "";

let vendor = "";

let scannedCount = 0;

let successCount = 0;

let duplicateCount = 0;


/*************************************************
 * START CAMERA
 *************************************************/

async function startCamera() {

  try {

    const stream =
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
          }

        },

        audio: false

      });


    video.srcObject =
      stream;


    await video.play();


    console.log(
      "Camera aktif:",
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
      "Kamera tidak dapat digunakan.\n\n" +
      error.message
    );

  }

}


/*************************************************
 * CAPTURE IMAGE FAST
 *************************************************/

function captureCrop() {

  if (
    !video.videoWidth ||
    !video.videoHeight
  ) {

    throw new Error(
      "Kamera belum siap"
    );

  }


  const ctx =
    canvas.getContext(
      "2d"
    );


  const videoWidth =
    video.videoWidth;

  const videoHeight =
    video.videoHeight;


  /***********************************************
   * AREA TANGKAP
   *
   * 90% lebar
   * 45% tinggi
   ***********************************************/

  const cropX =
    videoWidth * 0.05;

  const cropY =
    videoHeight * 0.275;

  const cropWidth =
    videoWidth * 0.90;

  const cropHeight =
    videoHeight * 0.45;


  /***********************************************
   * OUTPUT MAX 500 PX
   ***********************************************/

  const MAX_WIDTH =
    500;


  const ratio =
    Math.min(
      1,
      MAX_WIDTH / cropWidth
    );


  const outputWidth =
    Math.round(
      cropWidth * ratio
    );


  const outputHeight =
    Math.round(
      cropHeight * ratio
    );


  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;


  /***********************************************
   * DRAW
   ***********************************************/

  ctx.drawImage(

    video,

    cropX,
    cropY,

    cropWidth,
    cropHeight,

    0,
    0,

    outputWidth,
    outputHeight

  );


  /***********************************************
   * JPEG 35%
   ***********************************************/

  const image =
    canvas.toDataURL(
      "image/jpeg",
      0.35
    );


  console.log(
    "Image:",
    outputWidth,
    "x",
    outputHeight
  );


  console.log(
    "Base64 size:",
    Math.round(
      image.length / 1024
    ),
    "KB"
  );


  return image;

}


/*************************************************
 * SEND OCR
 *************************************************/

async function sendOCR(
  image,
  mode
) {

  console.log(
    "OCR START:",
    mode
  );


  const startTime =
    performance.now();


  try {

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


    const endTime =
      performance.now();


    console.log(
      "OCR SELESAI:",
      Math.round(
        endTime -
        startTime
      ),
      "ms"
    );


    console.log(
      "OCR RESULT:",
      result
    );


    return result;


  } catch (error) {

    console.error(
      "OCR ERROR:",
      error
    );


    throw error;

  }

}


/*************************************************
 * SCAN NOMOR
 *************************************************/

async function scanNomor() {

  if (
    currentStep !== 1
  ) {

    return;

  }


  const button =
    document.getElementById(
      "scanButton"
    );


  try {

    setLoading(
      true,
      "Membaca nomor..."
    );


    button.disabled =
      true;


    const image =
      captureCrop();


    const result =
      await sendOCR(
        image,
        "number"
      );


    scannedCount++;


    if (
      result.success &&
      result.nomor
    ) {

      nomorDokumen =
        result.nomor;


      successCount++;


      document.getElementById(
        "hasil"
      ).textContent =
        nomorDokumen;


      document.getElementById(
        "vendor"
      ).textContent =
        "-";


      document.getElementById(
        "status"
      ).textContent =
        "Nomor ditemukan";


      /*******************************************
       * PINDAH KE SCAN VENDOR
       *******************************************/

      currentStep =
        2;


      button.textContent =
        "📷 SCAN VENDOR";


      document.getElementById(
        "stepTitle"
      ).textContent =
        "SCAN 2 — VENDOR";


      document.getElementById(
        "scanLabel"
      ).textContent =
        "ARAHKAN NAMA VENDOR KE SINI";


      beep();


    } else {

      document.getElementById(
        "status"
      ).textContent =
        "Nomor tidak ditemukan";


      alert(
        "Nomor dokumen tidak ditemukan.\n\n" +
        "Coba dekatkan nomor ke area scan."
      );

    }


    updateStats();


  } catch (error) {

    console.error(
      error
    );


    document.getElementById(
      "status"
    ).textContent =
      "ERROR";


    alert(
      "Gagal scan nomor.\n\n" +
      error.message
    );


  } finally {

    button.disabled =
      false;


    setLoading(
      false
    );

  }

}


/*************************************************
 * SCAN VENDOR
 *************************************************/

async function scanVendor() {

  if (
    currentStep !== 2
  ) {

    return;

  }


  const button =
    document.getElementById(
      "scanButton"
    );


  try {

    setLoading(
      true,
      "Membaca vendor..."
    );


    button.disabled =
      true;


    const image =
      captureCrop();


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


      document.getElementById(
        "vendor"
      ).textContent =
        vendor;


      document.getElementById(
        "status"
      ).textContent =
        "Vendor ditemukan";


      /*******************************************
       * SIMPAN
       *******************************************/

      await finalizeDocument();


    } else {

      document.getElementById(
        "status"
      ).textContent =
        "Vendor tidak ditemukan";


      alert(
        "Vendor tidak ditemukan.\n\n" +
        "Coba arahkan kamera ke nama vendor."
      );

    }


  } catch (error) {

    console.error(
      error
    );


    document.getElementById(
      "status"
    ).textContent =
      "ERROR";


    alert(
      "Gagal scan vendor.\n\n" +
      error.message
    );


  } finally {

    button.disabled =
      false;


    setLoading(
      false
    );

  }

}


/*************************************************
 * FINALIZE DOCUMENT
 *************************************************/

async function finalizeDocument() {

  console.log(
    "FINALIZE:",
    nomorDokumen,
    vendor
  );


  try {

    setLoading(
      true,
      "Menyimpan..."
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
      "FINALIZE RESULT:",
      result
    );


    if (
      result.success
    ) {

      if (
        result.duplicate
      ) {

        duplicateCount++;


        document.getElementById(
          "status"
        ).textContent =
          "DUPLIKAT";


        alert(
          "Nomor dokumen sudah pernah masuk filling."
        );


      } else {

        successCount++;


        document.getElementById(
          "status"
        ).textContent =
          "SUDAH MASUK FILLING";


        beep();


        vibrate();


      }


      updateStats();


      /*****************************************
       * SELESAI
       *****************************************/

      currentStep =
        3;


      document.getElementById(
        "scanButton"
      ).textContent =
        "📷 SCAN DOKUMEN BARU";


      document.getElementById(
        "scanButton"
      ).onclick =
        resetScanner;


      document.getElementById(
        "resetButton"
      ).style.display =
        "block";


    } else {

      throw new Error(
        result.message ||
        "Gagal menyimpan dokumen"
      );

    }


  } catch (error) {

    console.error(
      "FINALIZE ERROR:",
      error
    );


    document.getElementById(
      "status"
    ).textContent =
      "GAGAL SIMPAN";


    alert(
      "Dokumen gagal disimpan.\n\n" +
      error.message
    );

  } finally {

    setLoading(
      false
    );

  }

}


/*************************************************
 * MAIN BUTTON
 *************************************************/

function handleScan() {

  if (
    currentStep === 1
  ) {

    scanNomor();

    return;

  }


  if (
    currentStep === 2
  ) {

    scanVendor();

    return;

  }


  if (
    currentStep === 3
  ) {

    resetScanner();

  }

}


/*************************************************
 * RESET
 *************************************************/

function resetScanner() {

  nomorDokumen =
    "";

  vendor =
    "";

  currentStep =
    1;


  document.getElementById(
    "hasil"
  ).textContent =
    "-";


  document.getElementById(
    "vendor"
  ).textContent =
    "-";


  document.getElementById(
    "status"
  ).textContent =
    "Siap scan";


  document.getElementById(
    "stepTitle"
  ).textContent =
    "SCAN 1 — NOMOR DOKUMEN";


  document.getElementById(
    "scanLabel"
  ).textContent =
    "ARAHKAN NOMOR DOKUMEN KE SINI";


  const button =
    document.getElementById(
      "scanButton"
    );


  button.textContent =
    "📷 SCAN NOMOR";


  button.onclick =
    handleScan;


  document.getElementById(
    "resetButton"
  ).style.display =
    "none";

}


/*************************************************
 * LOADING
 *************************************************/

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


    if (text) {

      loading.querySelector(
        ".loading-text"
      ).textContent =
        text;

    }

  } else {

    loading.style.display =
      "none";

  }

}


/*************************************************
 * STATS
 *************************************************/

function updateStats() {

  const scanned =
    document.getElementById(
      "scanned"
    );

  const berhasil =
    document.getElementById(
      "berhasil"
    );

  const duplicate =
    document.getElementById(
      "duplicate"
    );


  if (scanned) {

    scanned.textContent =
      scannedCount;

  }


  if (berhasil) {

    berhasil.textContent =
      successCount;

  }


  if (duplicate) {

    duplicate.textContent =
      duplicateCount;

  }

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


    oscillator.frequency.value =
      900;


    oscillator.type =
      "sine";


    gain.gain.value =
      0.15;


    oscillator.connect(
      gain
    );


    gain.connect(
      audioContext.destination
    );


    oscillator.start();


    setTimeout(
      function() {

        oscillator.stop();

        audioContext.close();

      },
      120
    );


  } catch (error) {

    console.log(
      "Beep tidak tersedia"
    );

  }

}


/*************************************************
 * VIBRATE
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
 * BUTTON EVENT
 *************************************************/

const scanButton =
  document.getElementById(
    "scanButton"
  );


if (scanButton) {

  scanButton.onclick =
    handleScan;

}


/*************************************************
 * START CAMERA
 *************************************************/

startCamera();


/*************************************************
 * INITIAL STATS
 *************************************************/

updateStats();
