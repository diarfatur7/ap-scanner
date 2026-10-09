
"use strict";

/*************************************************
 * SCAN PAYMENT VOUCHER ONLY
 * Target nomor: 3400...
 * Tidak menyimpan foto atau hasil ke server database
 *************************************************/

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";

const PV_PREFIX = "3400";

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const captureButton = document.getElementById("captureButton");
const retakeButton = document.getElementById("retakeButton");
const nextButton = document.getElementById("nextButton");

const cameraControls = document.getElementById("cameraControls");
const previewSection = document.getElementById("previewSection");
const previewImage = document.getElementById("previewImage");

const saveStatus = document.getElementById("saveStatus");
const queueList = document.getElementById("queueList");
const scanCounter = document.getElementById("scanCounter");

const latestNumber = document.getElementById("latestNumber");
const resultSection = document.getElementById("resultSection");
const copyLatestButton = document.getElementById("copyLatestButton");
const copyAllButton = document.getElementById("copyAllButton");
const clearButton = document.getElementById("clearButton");

const cameraStatus = document.getElementById("cameraStatus");
const connectionDot = document.getElementById("connectionDot");
const instructionTitle = document.getElementById("instructionTitle");
const instructionText = document.getElementById("instructionText");

let cameraStream = null;
let capturedImage = null;
let isProcessing = false;
let isCameraStarting = false;

let scanResults = [];

// ================================================
// CAMERA
// ================================================

async function startCamera() {
  if (isCameraStarting) return;

  isCameraStarting = true;

  try {
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Kamera membutuhkan HTTPS atau localhost."
      );
    }

    cameraStatus.textContent = "Menyiapkan kamera";

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 960 }
      },
      audio: false
    });

    camera.srcObject = cameraStream;

    await new Promise(function(resolve, reject) {
      if (camera.readyState >= 2) {
        resolve();
        return;
      }

      camera.onloadedmetadata = function() {
        resolve();
      };

      camera.onerror = function() {
        reject(new Error("Video kamera gagal dimuat."));
      };
    });

    await camera.play();

    cameraStatus.textContent = "Kamera aktif";
    connectionDot.classList.add("online");
    connectionDot.classList.remove("offline");

    instructionTitle.textContent = "Foto Payment Voucher";
    instructionText.textContent =
      "Posisikan nomor PV awalan 3400 di area kamera.";

  } catch (error) {
    console.error("Kamera:", error);

    cameraStatus.textContent = "Kamera gagal";
    connectionDot.classList.add("offline");

    showStatus(
      "Kamera tidak dapat digunakan: " + error.message,
      "error"
    );

  } finally {
    isCameraStarting = false;
  }
}

// ================================================
// CAPTURE PHOTO
// ================================================

function capturePhoto() {
  if (isProcessing) return;

  if (!camera.videoWidth || !camera.videoHeight) {
    showStatus("Kamera belum siap. Coba lagi.", "error");
    return;
  }

  try {
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    ctx.drawImage(
      camera,
      0,
      0,
      canvas.width,
      canvas.height
    );

    capturedImage = canvas.toDataURL("image/jpeg", 0.80);

    previewImage.src = capturedImage;

    previewSection.classList.remove("hidden");
    cameraControls.classList.add("hidden");

    instructionTitle.textContent = "Periksa Foto PV";
    instructionText.textContent =
      "Pastikan nomor 3400 terlihat jelas sebelum OCR.";

    hideStatus();

  } catch (error) {
    showStatus("Gagal mengambil foto: " + error.message, "error");
  }
}

// ================================================
// RETAKE PHOTO
// ================================================

function retakePhoto() {
  if (isProcessing) return;

  clearCapturedPhoto();

  previewSection.classList.add("hidden");
  cameraControls.classList.remove("hidden");

  instructionTitle.textContent = "Foto Payment Voucher";
  instructionText.textContent =
    "Arahkan kamera ke nomor PV awalan 3400.";

  hideStatus();
}

// ================================================
// CLEAR TEMPORARY PHOTO
// ================================================

function clearCapturedPhoto() {
  capturedImage = null;
  previewImage.removeAttribute("src");

  // Bersihkan canvas setelah proses foto selesai.
  canvas.width = 1;
  canvas.height = 1;
}

// ================================================
// SEND OCR REQUEST
// ================================================

async function sendOCR(image) {
  const response = await fetch(WEBAPP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      image: image,
      mode: "number"
    })
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  return await response.json();
}

// ================================================
// PROCESS PV
// ================================================

async function processPV() {
  if (isProcessing || !capturedImage) return;

  isProcessing = true;

  captureButton.disabled = true;
  retakeButton.disabled = true;
  nextButton.disabled = true;

  nextButton.textContent = "Memproses OCR...";

  showStatus(
    "Sedang membaca nomor Payment Voucher...",
    "loading"
  );

  cameraStatus.textContent = "Memproses";

  try {
    // Kirim foto hanya untuk diproses OCR.
    const result = await sendOCR(capturedImage);

    if (!result || !result.success || !result.nomor) {
      throw new Error(
        result && result.error
          ? result.error
          : "Nomor PV tidak ditemukan."
      );
    }

    const nomor = String(result.nomor).replace(/\D/g, "");

    // Validasi awalan 3400.
    if (!nomor.startsWith(PV_PREFIX) || nomor.length < 8) {
      throw new Error(
        "Nomor tidak sesuai awalan PV 3400."
      );
    }

    // Hasil disimpan hanya dalam memori halaman.
    scanResults.unshift({
      nomor: nomor,
      waktu: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    });

    renderQueue();

    latestNumber.textContent = nomor;
    resultSection.classList.remove("hidden");

    showStatus(
      "Berhasil membaca PV: " + nomor,
      "success"
    );

    instructionTitle.textContent = "PV Berhasil Dibaca";
    instructionText.textContent =
      "Kamu dapat langsung memfoto Payment Voucher berikutnya.";

    clearCapturedPhoto();

    previewSection.classList.add("hidden");
    cameraControls.classList.remove("hidden");

    cameraStatus.textContent = "Kamera aktif";

    beep();
    vibrate();

  } catch (error) {
    console.error("OCR:", error);

    showStatus(
      "Gagal membaca PV: " + error.message +
      " Kamu dapat mencoba OCR kembali atau mengulang foto.",
      "error"
    );

    // Foto tetap tersedia agar OCR dapat dicoba ulang.
    nextButton.textContent = "🔄 Coba OCR Lagi";

  } finally {
    isProcessing = false;

    captureButton.disabled = false;
    retakeButton.disabled = false;
    nextButton.disabled = false;

    if (capturedImage) {
      nextButton.textContent = "🔎 Baca Nomor PV";
    } else {
      nextButton.textContent = "🔎 Baca Nomor PV";
    }

    cameraStatus.textContent = "Kamera aktif";
  }
}

// ================================================
// DISPLAY QUEUE
// ================================================

function renderQueue() {
  scanCounter.textContent = scanResults.length + " PV";

  queueList.replaceChildren();

  if (scanResults.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-queue";
    empty.textContent = "Belum ada PV yang dipindai.";

    queueList.appendChild(empty);
    return;
  }

  scanResults.forEach(function(item, index) {
    const row = document.createElement("div");
    row.className = "queue-item";

    const top = document.createElement("div");
    top.className = "queue-top";

    const number = document.createElement("span");
    number.className = "queue-number";
    number.textContent = item.nomor;

    const status = document.createElement("span");
    status.className = "queue-status";
    status.textContent = "Berhasil";

    top.append(number, status);

    const detail = document.createElement("div");
    detail.className = "queue-detail";
    detail.textContent =
      "Scan #" + (scanResults.length - index) +
      " · " + item.waktu;

    const copyButton = document.createElement("button");
    copyButton.className = "button secondary";
    copyButton.style.marginTop = "10px";
    copyButton.style.width = "100%";
    copyButton.textContent = "Salin Nomor";

    copyButton.addEventListener("click", function() {
      copyText(item.nomor);
    });

    row.append(top, detail, copyButton);
    queueList.appendChild(row);
  });
}

// ================================================
// COPY
// ================================================

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";

      document.body.appendChild(textarea);
      textarea.select();

      const copied = document.execCommand("copy");
      textarea.remove();

      if (!copied) {
        throw new Error("Salin otomatis tidak tersedia.");
      }
    }

    showStatus("Nomor berhasil disalin.", "success");

  } catch (error) {
    showStatus(
      "Tidak bisa menyalin otomatis. Nomor: " + text,
      "error"
    );
  }
}

copyLatestButton.addEventListener("click", function() {
  if (scanResults.length) {
    copyText(scanResults[0].nomor);
  }
});

copyAllButton.addEventListener("click", function() {
  if (!scanResults.length) {
    showStatus("Belum ada nomor PV.", "error");
    return;
  }

  const allNumbers = scanResults
    .map(function(item) {
      return item.nomor;
    })
    .join("\n");

  copyText(allNumbers);
});

// ================================================
// CLEAR TEMPORARY RESULTS
// ================================================

clearButton.addEventListener("click", function() {
  if (!scanResults.length) return;

  const confirmed = window.confirm(
    "Hapus semua nomor PV dari daftar sementara?"
  );

  if (!confirmed) return;

  scanResults = [];
  renderQueue();

  latestNumber.textContent = "—";
  resultSection.classList.add("hidden");

  showStatus("Daftar sementara telah dihapus.", "success");
});

// ================================================
// STATUS
// ================================================

function showStatus(message, type) {
  saveStatus.textContent = message;
  saveStatus.className = "save-status " + type;
}

function hideStatus() {
  saveStatus.textContent = "";
  saveStatus.className = "save-status hidden";
}

// ================================================
// SOUND AND VIBRATION
// ================================================

function beep() {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.frequency.value = 850;
    gain.gain.value = 0.12;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();

    setTimeout(function() {
      oscillator.stop();
      audio.close();
    }, 120);

  } catch (error) {
    console.log("Audio tidak tersedia.");
  }
}

function vibrate() {
  if (navigator.vibrate) {
    navigator.vibrate(100);
  }
}

// ================================================
// BUTTON EVENTS
// ================================================

captureButton.addEventListener("click", capturePhoto);
retakeButton.addEventListener("click", retakePhoto);
nextButton.addEventListener("click", processPV);

// ================================================
// START AND CLEANUP
// ================================================

renderQueue();
startCamera();

window.addEventListener("pagehide", function() {
  clearCapturedPhoto();

  if (cameraStream) {
    cameraStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }
});
