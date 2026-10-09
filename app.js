
/*************************************************
 * SCAN PV 34 — FRONTEND
 * Kompatibel dengan index.html yang dikirim
 *
 * FITUR:
 * - Kamera belakang
 * - Foto langsung dari kamera
 * - Preview sebelum OCR
 * - OCR hanya nomor PV awalan 34
 * - Bisa scan banyak PV secara berurutan
 * - Tidak menyimpan foto
 * - Tidak menyimpan hasil ke Google Sheets
 * - Tidak ada scan vendor
 *************************************************/

// ================================================
// CONFIG
// ================================================

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";

const PV_PREFIX = "34";

// ================================================
// ELEMENT
// ================================================

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const captureButton =
  document.getElementById("captureButton");

const retakeButton =
  document.getElementById("retakeButton");

const nextButton =
  document.getElementById("nextButton");

const cameraControls =
  document.getElementById("cameraControls");

const previewSection =
  document.getElementById("previewSection");

const previewImage =
  document.getElementById("previewImage");

const previewTitle =
  document.getElementById("previewTitle");

const saveStatus =
  document.getElementById("saveStatus");

const queueList =
  document.getElementById("queueList");

const stageLabel =
  document.getElementById("stageLabel");

const cameraStatus =
  document.getElementById("cameraStatus");

const instructionTitle =
  document.getElementById("instructionTitle");

const instructionText =
  document.getElementById("instructionText");

const connectionDot =
  document.getElementById("connectionDot");

// ================================================
// STATE
// ================================================

let cameraStream = null;
let capturedImage = null;
let isProcessing = false;
let scanCount = 0;

// Hasil hanya disimpan sementara di memori halaman.
const scanResults = [];

// ================================================
// START CAMERA
// ================================================

async function startCamera() {
  try {
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
      throw new Error(
        "Browser tidak mendukung kamera. Gunakan HTTPS."
      );
    }

    cameraStatus.textContent = "Mengaktifkan kamera...";

    cameraStream = await navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 960 }
        },
        audio: false
      });

    camera.srcObject = cameraStream;

    await camera.play();

    cameraStatus.textContent = "Kamera aktif";
    connectionDot.style.background = "#22c55e";

    showCameraMode();

  } catch (error) {
    console.error("Camera error:", error);

    cameraStatus.textContent = "Kamera gagal";

    showStatus(
      "Kamera tidak dapat digunakan: " + error.message,
      "error"
    );
  }
}

// ================================================
// CAPTURE PHOTO
// ================================================

function capturePhoto() {
  if (isProcessing) return;

  try {
    if (!camera.videoWidth || !camera.videoHeight) {
      throw new Error("Kamera belum siap.");
    }

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
      camera,
      0,
      0,
      canvas.width,
      canvas.height
    );

    // Foto hanya disimpan sementara di memori.
    // Tidak diunggah sebelum tombol proses ditekan.
    capturedImage = canvas.toDataURL(
      "image/jpeg",
      0.70
    );

    previewImage.src = capturedImage;

    previewTitle.textContent = "Preview Foto PV";
    nextButton.textContent = "🔎 Baca Nomor PV";

    previewSection.classList.remove("hidden");
    cameraControls.classList.add("hidden");

    instructionTitle.textContent = "Periksa Foto PV";
    instructionText.textContent =
      "Pastikan nomor PV terlihat jelas sebelum diproses.";

    stageLabel.textContent = "📄 PREVIEW PV";

    hideStatus();

  } catch (error) {
    console.error("Capture error:", error);

    showStatus(error.message, "error");
  }
}

// ================================================
// RETAKE PHOTO
// ================================================

function retakePhoto() {
  if (isProcessing) return;

  // Hapus referensi foto sebelumnya dari state aplikasi.
  capturedImage = null;
  previewImage.removeAttribute("src");

  previewSection.classList.add("hidden");
  cameraControls.classList.remove("hidden");

  showCameraMode();
  hideStatus();
}

// ================================================
// SEND PHOTO TO OCR BACKEND
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
  nextButton.disabled = true;
  retakeButton.disabled = true;

  nextButton.textContent = "⏳ Memproses...";

  showStatus(
    "Sedang membaca nomor PV melalui OCR...",
    "loading"
  );

  updateCameraStatus("Memproses OCR...");

  const imageToProcess = capturedImage;

  try {
    const result = await sendOCR(imageToProcess);

    if (!result || !result.success || !result.nomor) {
      throw new Error(
        result && result.error
          ? result.error
          : "Nomor PV tidak ditemukan."
      );
    }

    // Normalisasi hasil agar hanya berisi angka.
    const nomor = String(result.nomor).replace(/\D/g, "");

    // Validasi tambahan di frontend.
    if (!nomor.startsWith(PV_PREFIX) ||
        nomor.length < 8) {
      throw new Error(
        "Hasil OCR bukan nomor PV awalan 34 yang valid."
      );
    }

    scanCount++;

    const item = {
      id: scanCount,
      nomor: nomor,
      status: "Berhasil"
    };

    scanResults.unshift(item);

    renderQueue();

    showStatus(
      "✅ Nomor PV berhasil dibaca: " + nomor,
      "success"
    );

    // Hapus foto dari state setelah selesai diproses.
    capturedImage = null;
    previewImage.removeAttribute("src");

    previewSection.classList.add("hidden");
    cameraControls.classList.remove("hidden");

    showCameraMode();

    instructionTitle.textContent = "PV Berhasil Dibaca";
    instructionText.textContent =
      "Nomor " + nomor +
      " berhasil dibaca. Foto PV berikutnya bisa langsung diambil.";

    stageLabel.textContent = "✅ PV TERBACA";

    beep();
    vibrate();

  } catch (error) {
    console.error("OCR error:", error);

    showStatus(
      "❌ " + error.message +
      " Silakan ulangi foto atau coba lagi.",
      "error"
    );

    // Preview tetap tampil supaya bisa dicoba ulang.
    nextButton.textContent = "🔄 Coba OCR Lagi";

  } finally {
    isProcessing = false;
    nextButton.disabled = false;
    retakeButton.disabled = false;

    if (!capturedImage) {
      nextButton.textContent = "🔎 Baca Nomor PV";
    }

    updateCameraStatus("Kamera aktif");
  }
}

// ================================================
// QUEUE DISPLAY
// ================================================

function renderQueue() {
  if (!scanResults.length) {
    queueList.innerHTML =
      '<div class="empty-queue">Belum ada scan.</div>';

    return;
  }

  queueList.innerHTML = "";

  scanResults.forEach(function(item) {
    const row = document.createElement("div");
    row.className = "queue-item";

    const top = document.createElement("div");
    top.className = "queue-top";

    const number = document.createElement("span");
    number.className = "queue-number";
    number.textContent = item.nomor;

    const status = document.createElement("span");
    status.className = "queue-status done";
    status.textContent = "Berhasil";

    top.appendChild(number);
    top.appendChild(status);

    const detail = document.createElement("div");
    detail.className = "queue-detail";
    detail.textContent = "Scan #" + item.id + " · Nomor PV";

    row.appendChild(top);
    row.appendChild(detail);

    queueList.appendChild(row);
  });
}

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

function updateCameraStatus(message) {
  cameraStatus.textContent = message;
}

function showCameraMode() {
  stageLabel.textContent = "📄 FOTO PV";
  cameraStatus.textContent = "Kamera aktif";

  instructionTitle.textContent = "Foto Payment Voucher";
  instructionText.textContent =
    "Arahkan kamera ke nomor PV yang diawali 34, lalu tekan tombol kamera.";
}

// ================================================
// BEEP
// ================================================

function beep() {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.frequency.value = 900;
    oscillator.type = "sine";
    gain.gain.value = 0.12;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    setTimeout(function() {
      oscillator.stop();
      audioContext.close();
    }, 120);

  } catch (error) {
    console.log("Audio tidak tersedia.");
  }
}

// ================================================
// VIBRATION
// ================================================

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
// INITIALIZE
// ================================================

renderQueue();
startCamera();

// Hentikan kamera ketika halaman ditutup atau ditinggalkan.
window.addEventListener("pagehide", function() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(function(track) {
      track.stop();
    });
  }

  capturedImage = null;
});
