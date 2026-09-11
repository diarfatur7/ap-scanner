/*************************************************
 * AP SCANNER FAST 2X SCAN
 * VERSION 5
 *
 * SCAN 1 = NOMOR DOKUMEN
 * SCAN 2 = VENDOR
 *
 * FAST MODE
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
  "AP SCANNER FAST 2X VERSION 5 AKTIF"
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
    !video ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    throw new Error("Kamera belum siap");
  }

  const scanner =
    document.querySelector(".scanner-card");

  const frame =
    document.getElementById("scanFrame");

  if (!scanner || !frame) {
    throw new Error("Area scanner tidak ditemukan");
  }

  const canvas =
    document.createElement("canvas");

  const ctx =
    canvas.getContext("2d");

  /*
   * ============================================
   * UKURAN VIDEO ASLI
   * ============================================
   */

  const videoWidth =
    video.videoWidth;

  const videoHeight =
    video.videoHeight;


  /*
   * ============================================
   * POSISI VIDEO DI DALAM SCANNER
   *
   * Karena CSS menggunakan:
   *
   * object-fit: cover
   *
   * maka kita harus menghitung bagian video
   * yang terlihat di layar.
   * ============================================
   */

  const containerWidth =
    scanner.clientWidth;

  const containerHeight =
    scanner.clientHeight;


  const videoRatio =
    videoWidth / videoHeight;

  const containerRatio =
    containerWidth / containerHeight;


  let renderedWidth;
  let renderedHeight;

  let offsetX = 0;
  let offsetY = 0;


  if (
    videoRatio >
    containerRatio
  ) {

    /*
     * Video lebih lebar.
     */

    renderedHeight =
      containerHeight;

    renderedWidth =
      renderedHeight *
      videoRatio;

    offsetX =
      (renderedWidth -
       containerWidth) / 2;

  } else {

    /*
     * Video lebih tinggi.
     */

    renderedWidth =
      containerWidth;

    renderedHeight =
      renderedWidth /
      videoRatio;

    offsetY =
      (renderedHeight -
       containerHeight) / 2;

  }


  /*
   * ============================================
   * POSISI FRAME HIJAU
   * relatif terhadap scanner
   * ============================================
   */

  const scannerRect =
    scanner.getBoundingClientRect();

  const frameRect =
    frame.getBoundingClientRect();


  const frameX =
    frameRect.left -
    scannerRect.left;

  const frameY =
    frameRect.top -
    scannerRect.top;


  const frameWidth =
    frameRect.width;

  const frameHeight =
    frameRect.height;


  /*
   * ============================================
   * KONVERSI FRAME LAYAR
   * KE KOORDINAT VIDEO ASLI
   * ============================================
   */

  let sourceX =
    (frameX +
     offsetX) *
    (videoWidth /
     renderedWidth);


  let sourceY =
    (frameY +
     offsetY) *
    (videoHeight /
     renderedHeight);


  let sourceWidth =
    frameWidth *
    (videoWidth /
     renderedWidth);


  let sourceHeight =
    frameHeight *
    (videoHeight /
     renderedHeight);


  /*
   * ============================================
   * BATASI AGAR TIDAK KELUAR VIDEO
   * ============================================
   */

  sourceX =
    Math.max(
      0,
      Math.min(
        sourceX,
        videoWidth
      )
    );


  sourceY =
    Math.max(
      0,
      Math.min(
        sourceY,
        videoHeight
      )
    );


  sourceWidth =
    Math.min(
      sourceWidth,
      videoWidth -
      sourceX
    );


  sourceHeight =
    Math.min(
      sourceHeight,
      videoHeight -
      sourceY
    );


  /*
   * ============================================
   * OUTPUT KECIL
   * ============================================
   */

  const MAX_WIDTH =
    500;


  const ratio =
    Math.min(
      1,
      MAX_WIDTH /
      sourceWidth
    );


  const outputWidth =
    Math.max(
      1,
      Math.round(
        sourceWidth *
        ratio
      )
    );


  const outputHeight =
    Math.max(
      1,
      Math.round(
        sourceHeight *
        ratio
      )
    );


  canvas.width =
    outputWidth;

  canvas.height =
    outputHeight;


  /*
   * ============================================
   * AMBIL HANYA AREA HIJAU
   * ============================================
   */

  ctx.drawImage(

    video,

    sourceX,
    sourceY,

    sourceWidth,
    sourceHeight,

    0,
    0,

    outputWidth,
    outputHeight

  );


  /*
   * ============================================
   * KOMPRESI
   * ============================================
   */

  const image =
    canvas.toDataURL(
      "image/jpeg",
      0.35
    );


  console.log(
    "========== FAST CROP =========="
  );

  console.log(
    "Video:",
    videoWidth,
    "x",
    videoHeight
  );

  console.log(
    "Frame:",
    Math.round(frameWidth),
    "x",
    Math.round(frameHeight)
  );

  console.log(
    "OCR source:",
    Math.round(sourceWidth),
    "x",
    Math.round(sourceHeight)
  );

  console.log(
    "Output:",
    outputWidth,
    "x",
    outputHeight
  );

  console.log(
    "Base64:",
    Math.round(
      image.length / 1024
    ),
    "KB"
  );

  console.log(
    "=============================="
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


    if (button) {

      button.disabled =
        true;

    }


    const image =
      captureCrop();


    const result =
      await sendOCR(
        image,
        "number"
      );


    scannedCount++;


    if (
      result &&
      result.success &&
      result.nomor
    ) {

      nomorDokumen =
        result.nomor;


      successCount++;


      const hasil =
        document.getElementById(
          "hasil"
        );


      if (hasil) {

        hasil.textContent =
          nomorDokumen;

      }


      const vendorElement =
        document.getElementById(
          "vendor"
        );


      if (vendorElement) {

        vendorElement.textContent =
          "-";

      }


      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "Nomor ditemukan";

      }


      /*****************************************
       * PINDAH KE SCAN 2
       *****************************************/

      currentStep =
        2;


      if (button) {

        button.textContent =
          "📷 SCAN VENDOR";

      }


      const stepTitle =
        document.getElementById(
          "stepTitle"
        );


      if (stepTitle) {

        stepTitle.textContent =
          "SCAN 2 — VENDOR";

      }


      const scanLabel =
        document.getElementById(
          "scanLabel"
        );


      if (scanLabel) {

        scanLabel.textContent =
          "ARAHKAN NAMA VENDOR KE SINI";

      }


      beep();

      vibrate();


    } else {

      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "Nomor tidak ditemukan";

      }


      alert(
        "Nomor dokumen tidak ditemukan.\n\n" +
        "Coba dekatkan nomor ke area scan."
      );

    }


    updateStats();


  } catch (error) {

    console.error(
      "SCAN NOMOR ERROR:",
      error
    );


    const status =
      document.getElementById(
        "status"
      );


    if (status) {

      status.textContent =
        "ERROR";

    }


    alert(
      "Gagal scan nomor.\n\n" +
      error.message
    );


  } finally {

    if (button) {

      button.disabled =
        false;

    }


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


    if (button) {

      button.disabled =
        true;

    }


    const image =
      captureCrop();


    const result =
      await sendOCR(
        image,
        "vendor"
      );


    scannedCount++;


    if (
      result &&
      result.success &&
      result.vendor
    ) {

      vendor =
        result.vendor;


      successCount++;


      const vendorElement =
        document.getElementById(
          "vendor"
        );


      if (vendorElement) {

        vendorElement.textContent =
          vendor;

      }


      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "Vendor ditemukan";

      }


      /*****************************************
       * SIMPAN OTOMATIS
       *****************************************/

      await finalizeDocument();


    } else {

      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "Vendor tidak ditemukan";

      }


      alert(
        "Vendor tidak ditemukan.\n\n" +
        "Coba arahkan kamera ke nama vendor."
      );

    }


    updateStats();


  } catch (error) {

    console.error(
      "SCAN VENDOR ERROR:",
      error
    );


    const status =
      document.getElementById(
        "status"
      );


    if (status) {

      status.textContent =
        "ERROR";

      }


    alert(
      "Gagal scan vendor.\n\n" +
      error.message
    );


  } finally {

    if (button) {

      button.disabled =
        false;

    }


    setLoading(
      false
    );

  }

}


/*************************************************
 * FINALIZE / SAVE
 *************************************************/

async function finalizeDocument() {

  console.log(
    "===== FINALIZE ====="
  );


  console.log(
    "Nomor:",
    nomorDokumen
  );


  console.log(
    "Vendor:",
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
      !result.success
    ) {

      throw new Error(
        result.message ||
        "Gagal menyimpan dokumen"
      );

    }


    /*********************************************
     * DUPLICATE
     *********************************************/

    if (
      result.duplicate
    ) {

      duplicateCount++;


      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "DUPLIKAT";

      }


      alert(
        "Nomor dokumen sudah pernah masuk filling."
      );


    } else {

      const status =
        document.getElementById(
          "status"
        );


      if (status) {

        status.textContent =
          "SUDAH MASUK FILLING";

      }


      beep();

      vibrate();

    }


    updateStats();


    /*********************************************
     * SELESAI
     *********************************************/

    currentStep =
      3;


    const button =
      document.getElementById(
        "scanButton"
      );


    if (button) {

      button.textContent =
        "📷 SCAN DOKUMEN BARU";

      button.onclick =
        resetScanner;

    }


    const resetButton =
      document.getElementById(
        "resetButton"
      );


    if (resetButton) {

      resetButton.style.display =
        "block";

    }


  } catch (error) {

    console.error(
      "FINALIZE ERROR:",
      error
    );


    const status =
      document.getElementById(
        "status"
      );


    if (status) {

      status.textContent =
        "GAGAL SIMPAN";

    }


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

  console.log(
    "Current step:",
    currentStep
  );


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

  console.log(
    "RESET SCANNER"
  );


  nomorDokumen =
    "";

  vendor =
    "";

  currentStep =
    1;


  const hasil =
    document.getElementById(
      "hasil"
    );


  if (hasil) {

    hasil.textContent =
      "-";

  }


  const vendorElement =
    document.getElementById(
      "vendor"
    );


  if (vendorElement) {

    vendorElement.textContent =
      "-";

  }


  const status =
    document.getElementById(
      "status"
    );


  if (status) {

    status.textContent =
      "Siap scan";

  }


  const stepTitle =
    document.getElementById(
      "stepTitle"
    );


  if (stepTitle) {

    stepTitle.textContent =
      "SCAN 1 — NOMOR DOKUMEN";

  }


  const scanLabel =
    document.getElementById(
      "scanLabel"
    );


  if (scanLabel) {

    scanLabel.textContent =
      "ARAHKAN NOMOR DOKUMEN KE SINI";

  }


  const button =
    document.getElementById(
      "scanButton"
    );


  if (button) {

    button.textContent =
      "📷 SCAN NOMOR";

    button.onclick =
      handleScan;

  }


  const resetButton =
    document.getElementById(
      "resetButton"
    );


  if (resetButton) {

    resetButton.style.display =
      "none";

  }

}


/*************************************************
 * LOADING
 *
 * DIPERBAIKI:
 * Tidak akan error kalau
 * .loading atau .loading-text tidak ada.
 *************************************************/

function setLoading(
  active,
  text
) {

  const loading =
    document.getElementById(
      "loading"
    );


  /***********************************************
   * Kalau elemen loading tidak ada,
   * jangan hentikan scanner.
   ***********************************************/

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


      /*******************************************
       * CEK SEBELUM textContent
       *******************************************/

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

  try {

    if (
      navigator.vibrate
    ) {

      navigator.vibrate(
        100
      );

    }

  } catch (error) {

    console.log(
      "Vibrate tidak tersedia"
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
 * START
 *************************************************/

startCamera();


/*************************************************
 * INITIAL STATS
 *************************************************/

updateStats();
