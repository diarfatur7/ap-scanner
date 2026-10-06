/* =========================================================
   CONFIGURATION
========================================================= */


/*
  GANTI URL DI BAWAH DENGAN URL WEB APP GOOGLE APPS SCRIPT.

  Contoh:

  https://script.google.com/macros/s/XXXXXXXXXXXX/exec
*/

const API_URL =
  "PASTE_URL_WEB_APP_APPS_SCRIPT_DI_SINI";


/* =========================================================
   VARIABLES
========================================================= */

let cameraStream = null;

let currentStep = "PV";

let photoPV = null;
let photoVendor = null;

let isSaving = false;


/* =========================================================
   DOM
========================================================= */

const camera =
  document.getElementById("camera");

const canvas =
  document.getElementById("canvas");

const captureButton =
  document.getElementById("captureButton");

const retakeButton =
  document.getElementById("retakeButton");

const nextButton =
  document.getElementById("nextButton");

const previewSection =
  document.getElementById("previewSection");

const previewImage =
  document.getElementById("previewImage");

const previewTitle =
  document.getElementById("previewTitle");

const cameraControls =
  document.getElementById("cameraControls");

const stageLabel =
  document.getElementById("stageLabel");

const cameraStatus =
  document.getElementById("cameraStatus");

const instructionTitle =
  document.getElementById("instructionTitle");

const instructionText =
  document.getElementById("instructionText");

const saveStatus =
  document.getElementById("saveStatus");

const queueList =
  document.getElementById("queueList");

const connectionDot =
  document.getElementById("connectionDot");


/* =========================================================
   INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async function() {

    updateUI();

    await startCamera();

    refreshQueue();

    setInterval(
      refreshQueue,
      10000
    );

  }
);


/* =========================================================
   CAMERA
========================================================= */

async function startCamera() {

  try {

    stopCamera();

    cameraStatus.textContent =
      "Membuka kamera...";


    cameraStream =
      await navigator.mediaDevices.getUserMedia({

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


    camera.srcObject =
      cameraStream;


    await camera.play();


    cameraStatus.textContent =
      "Kamera aktif";


    connectionDot.style.background =
      "#22c55e";


  }

  catch(error) {

    console.error(error);

    cameraStatus.textContent =
      "Kamera gagal";

    connectionDot.style.background =
      "#ef4444";


    showStatus(
      "Kamera tidak dapat dibuka. Pastikan izin kamera browser sudah diberikan.",
      "error"
    );

  }

}


/* =========================================================
   STOP CAMERA
========================================================= */

function stopCamera() {

  if (!cameraStream) {
    return;
  }


  cameraStream
    .getTracks()
    .forEach(
      track => track.stop()
    );


  cameraStream = null;

}


/* =========================================================
   CAPTURE
========================================================= */

captureButton.addEventListener(
  "click",
  capturePhoto
);


function capturePhoto() {

  if (!cameraStream) {

    showStatus(
      "Kamera belum siap.",
      "error"
    );

    return;

  }


  const videoWidth =
    camera.videoWidth;

  const videoHeight =
    camera.videoHeight;


  if (
    !videoWidth ||
    !videoHeight
  ) {

    showStatus(
      "Kamera belum siap. Tunggu sebentar.",
      "error"
    );

    return;

  }


  /*
    Batasi resolusi maksimal
    agar upload cepat.
  */

  const MAX_WIDTH = 1600;

  let width =
    videoWidth;

  let height =
    videoHeight;


  if (width > MAX_WIDTH) {

    const ratio =
      MAX_WIDTH / width;

    width =
      MAX_WIDTH;

    height =
      Math.round(
        height * ratio
      );

  }


  canvas.width =
    width;

  canvas.height =
    height;


  const ctx =
    canvas.getContext("2d");


  ctx.drawImage(
    camera,
    0,
    0,
    width,
    height
  );


  /*
    JPEG quality 82%
  */

  const dataURL =
    canvas.toDataURL(
      "image/jpeg",
      0.82
    );


  if (currentStep === "PV") {

    photoPV =
      dataURL;

    showPreview(
      dataURL,
      "📄 Preview Foto PV"
    );

  }

  else {

    photoVendor =
      dataURL;

    showPreview(
      dataURL,
      "🏢 Preview Foto Vendor"
    );

  }

}


/* =========================================================
   SHOW PREVIEW
========================================================= */

function showPreview(
  image,
  title
) {

  previewImage.src =
    image;

  previewTitle.textContent =
    title;


  previewSection.classList.remove(
    "hidden"
  );

  cameraControls.classList.add(
    "hidden"
  );

  camera.classList.add(
    "hidden"
  );


  if (currentStep === "PV") {

    nextButton.textContent =
      "Lanjut Foto Vendor →";

  }

  else {

    nextButton.textContent =
      "💾 SIMPAN";

  }

}


/* =========================================================
   RETAKE
========================================================= */

retakeButton.addEventListener(
  "click",
  function() {

    if (currentStep === "PV") {

      photoPV = null;

    }

    else {

      photoVendor = null;

    }


    hidePreview();

    startCamera();

  }
);


/* =========================================================
   NEXT
========================================================= */

nextButton.addEventListener(
  "click",
  function() {

    if (currentStep === "PV") {

      if (!photoPV) {

        showStatus(
          "Foto PV belum tersedia.",
          "error"
        );

        return;

      }


      currentStep =
        "VENDOR";


      photoVendor =
        null;


      hidePreview();

      updateUI();

      startCamera();

    }

    else {

      if (!photoVendor) {

        showStatus(
          "Foto vendor belum tersedia.",
          "error"
        );

        return;

      }


      saveScan();

    }

  }
);


/* =========================================================
   HIDE PREVIEW
========================================================= */

function hidePreview() {

  previewSection.classList.add(
    "hidden"
  );

  cameraControls.classList.remove(
    "hidden"
  );

  camera.classList.remove(
    "hidden"
  );

}


/* =========================================================
   SAVE
========================================================= */

async function saveScan() {

  if (isSaving) {
    return;
  }


  if (
    !photoPV ||
    !photoVendor
  ) {

    showStatus(
      "Foto PV dan vendor belum lengkap.",
      "error"
    );

    return;

  }


  isSaving =
    true;


  nextButton.disabled =
    true;

  retakeButton.disabled =
    true;


  showStatus(
    "💾 Menyimpan foto...",
    "loading"
  );


  try {

    /*
      Kirim ke Google Apps Script.
    */

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body: JSON.stringify({

            action:
              "uploadFoto",

            fotoPV:
              photoPV,

            fotoVendor:
              photoVendor,

            mimePV:
              "image/jpeg",

            mimeVendor:
              "image/jpeg"

          })

        }
      );


    const result =
      await response.json();


    console.log(
      "Backend response:",
      result
    );


    if (
      !result ||
      result.success === false
    ) {

      throw new Error(
        result?.message ||
        "Gagal menyimpan."
      );

    }


    showStatus(
      "✅ Foto tersimpan. OCR berjalan di background.",
      "success"
    );


    /*
      Reset
    */

    photoPV =
      null;

    photoVendor =
      null;

    currentStep =
      "PV";


    /*
      Tunggu sebentar kemudian
      langsung siap scan berikutnya.
    */

    setTimeout(
      async function() {

        hidePreview();

        hideStatus();

        nextButton.disabled =
          false;

        retakeButton.disabled =
          false;

        updateUI();

        await startCamera();

        refreshQueue();

      },
      800
    );


  }

  catch(error) {

    console.error(error);


    showStatus(
      "❌ Gagal menyimpan: " +
      error.message,
      "error"
    );


    nextButton.disabled =
      false;

    retakeButton.disabled =
      false;

  }


  isSaving =
    false;

}


/* =========================================================
   UI
========================================================= */

function updateUI() {

  if (currentStep === "PV") {

    stageLabel.textContent =
      "📄 FOTO PV";

    instructionTitle.textContent =
      "Foto Payment Voucher";

    instructionText.textContent =
      "Arahkan kamera ke dokumen PV lalu tekan tombol kamera.";

  }

  else {

    stageLabel.textContent =
      "🏢 FOTO VENDOR";

    instructionTitle.textContent =
      "Foto Nama Vendor";

    instructionText.textContent =
      "Arahkan kamera ke bagian nama vendor lalu tekan tombol kamera.";

  }

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
  message,
  type
) {

  saveStatus.textContent =
    message;

  saveStatus.className =
    "save-status " +
    type;

}


function hideStatus() {

  saveStatus.className =
    "save-status hidden";

  saveStatus.textContent =
    "";

}


/* =========================================================
   OCR QUEUE
========================================================= */

async function refreshQueue() {

  try {

    const url =
      API_URL +
      "?action=getRecentRows";


    const response =
      await fetch(url);


    const result =
      await response.json();


    if (
      result &&
      result.success === false
    ) {

      return;

    }


    renderQueue(
      result.rows ||
      result ||
      []
    );

  }

  catch(error) {

    console.error(
      "Queue error:",
      error
    );

  }

}


/* =========================================================
   RENDER QUEUE
========================================================= */

function renderQueue(rows) {

  if (
    !rows ||
    rows.length === 0
  ) {

    queueList.innerHTML = `

      <div class="empty-queue">
        Belum ada scan.
      </div>

    `;

    return;

  }


  queueList.innerHTML =
    "";


  rows.forEach(
    function(row) {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "queue-item";


      const status =
        String(
          row.status ||
          "UPLOADED"
        ).toUpperCase();


      let statusClass =
        "";


      if (
        status ===
        "SELESAI"
      ) {

        statusClass =
          "done";

      }

      else if (
        status ===
          "PROCESSING" ||
        status ===
          "PROSES"
      ) {

        statusClass =
          "process";

      }

      else if (
        status ===
        "ERROR"
      ) {

        statusClass =
          "error";

      }


      const nomorPV =
        row.nomorPV ||
        row.pv ||
        row.no ||
        "-";


      const vendor =
        row.vendor ||
        row.namaVendor ||
        "-";


      item.innerHTML = `

        <div class="queue-top">

          <div class="queue-number">
            PV ${escapeHTML(nomorPV)}
          </div>

          <div class="queue-status ${statusClass}">
            ${escapeHTML(status)}
          </div>

        </div>

        <div class="queue-detail">

          Vendor:
          ${escapeHTML(vendor)}

        </div>

      `;


      queueList.appendChild(
        item
      );

    }
  );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

  return String(value)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


/* =========================================================
   CLEANUP
========================================================= */

window.addEventListener(
  "beforeunload",
  function() {

    stopCamera();

  }
);
