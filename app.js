
/*************************************************
 * AP SCANNER — PV ONLY
 * OCR FLOW: FOTO → OCR → TAMBAH DAFTAR OTOMATIS
 *
 * CAMERA: 640x480
 * OUTPUT MAX: 500px
 * JPEG QUALITY: 35%
 * FOTO TIDAK DISIMPAN PERMANEN
 *************************************************/

const WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startButton = document.getElementById("startButton");
const scanButton = document.getElementById("scanButton");
const stopButton = document.getElementById("stopButton");

const statusElement = document.getElementById("status");
const cameraMessage = document.getElementById("cameraMessage");
const lastResult = document.getElementById("lastResult");
const lastPV = document.getElementById("lastPV");
const pvList = document.getElementById("pvList");
const totalCount = document.getElementById("totalCount");

let cameraStream = null;
let isScanning = false;
let scannedNumbers = [];

/*************************************************
 * STATUS
 *************************************************/

function setStatus(message) {
  statusElement.textContent = message;
  console.log("[AP SCANNER]", message);
}

/*************************************************
 * OPEN CAMERA
 *************************************************/

async function startCamera() {
  try {
    if (!navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser tidak mendukung kamera atau halaman bukan HTTPS.");
    }

    cameraMessage.textContent = "Mengaktifkan kamera...";
    startButton.disabled = true;

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 640 },
        height: { ideal: 480 }
      },
      audio: false
    });

    video.srcObject = cameraStream;
    await video.play();

    scanButton.disabled = false;
    stopButton.disabled = false;
    cameraMessage.textContent = "Kamera aktif";
    setStatus("Kamera siap. Tekan FOTO & SCAN PV untuk langsung memindai.");

  } catch (error) {
    startButton.disabled = false;
    cameraMessage.textContent = "Kamera tidak aktif";
    setStatus("Kamera gagal dibuka: " + error.message);
  }
}

/*************************************************
 * CLOSE CAMERA
 *************************************************/

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  video.srcObject = null;
  scanButton.disabled = true;
  stopButton.disabled = true;
  startButton.disabled = false;
  cameraMessage.textContent = "Kamera ditutup";

  setStatus("Kamera ditutup.");
}

/*************************************************
 * CAPTURE CROP — METODE LAMA
 *************************************************/

function captureCrop() {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error("Kamera belum siap.");
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  const cropX = videoWidth * 0.05;
  const cropY = videoHeight * 0.275;
  const cropWidth = videoWidth * 0.90;
  const cropHeight = videoHeight * 0.45;

  const MAX_WIDTH = 500;
  const ratio = Math.min(1, MAX_WIDTH / cropWidth);

  const outputWidth = Math.round(cropWidth * ratio);
  const outputHeight = Math.round(cropHeight * ratio);

  canvas.width = outputWidth;
  canvas.height = outputHeight;

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

  // Metode kompresi lama dipertahankan.
  const image = canvas.toDataURL("image/jpeg", 0.35);

  console.log(
    "Captured image:",
    outputWidth,
    "x",
    outputHeight,
    "Base64 KB:",
    Math.round(image.length / 1024)
  );

  return image;
}

/*************************************************
 * SEND OCR — BACKEND LAMA
 *************************************************/

async function sendOCR(image) {
  const startTime = performance.now();

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

  const result = await response.json();

  console.log(
    "OCR selesai:",
    Math.round(performance.now() - startTime),
    "ms",
    result
  );

  return result;
}

/*************************************************
 * ONE CLICK SCAN
 *************************************************/

async function scanPV() {
  if (isScanning) return;

  if (!cameraStream) {
    setStatus("Buka kamera terlebih dahulu.");
    return;
  }

  isScanning = true;
  scanButton.disabled = true;
  scanButton.textContent = "⏳ MEMPROSES OCR...";

  try {
    setStatus("Mengambil foto dan membaca nomor PV...");

    // Foto diambil langsung, tanpa upload manual.
    const image = captureCrop();

    // Langsung kirim ke OCR lama.
    const result = await sendOCR(image);

    if (!result || !result.success) {
      throw new Error(
        result?.error ||
        result?.message ||
        "Nomor PV tidak ditemukan."
      );
    }

    const rawPV = result.nomor || result.nomorDokumen || "";
    const pv = normalizePV(rawPV);

    if (!pv) {
      throw new Error("Nomor PV awalan 34 tidak ditemukan.");
    }

    lastPV.textContent = pv;
    lastResult.hidden = false;

    if (scannedNumbers.includes(pv)) {
      setStatus("Nomor PV " + pv + " sudah ada di daftar.");
      beep();
      return;
    }

    scannedNumbers.push(pv);
    updateList();

    setStatus("Berhasil scan: " + pv);
    beep();
    vibrate();

  } catch (error) {
    console.error("SCAN ERROR:", error);
    setStatus("Scan gagal: " + error.message);
    vibrateError();

  } finally {
    isScanning = false;
    scanButton.disabled = !cameraStream;
    scanButton.textContent = "📸 FOTO & SCAN PV";
  }
}

/*************************************************
 * VALIDATE PV
 * Menerima awalan 34, minimal 8 digit.
 *************************************************/

function normalizePV(value) {
  const digits = String(value).replace(/\D/g, "");

  if (/^34\d{6,}$/.test(digits)) {
    return digits;
  }

  return "";
}

/*************************************************
 * UPDATE TEMPORARY LIST
 *************************************************/

function updateList() {
  pvList.value = scannedNumbers
    .map((pv, index) => (index + 1) + ". " + pv)
    .join("\n");

  totalCount.textContent = scannedNumbers.length;
}

/*************************************************
 * COPY LIST
 *************************************************/

async function copyList() {
  if (!scannedNumbers.length) {
    setStatus("Daftar PV masih kosong.");
    return;
  }

  const text = scannedNumbers.join("\n");

  try {
    await navigator.clipboard.writeText(text);
    setStatus("Daftar PV berhasil disalin.");
  } catch (error) {
    pvList.focus();
    pvList.select();
    setStatus("Daftar dipilih. Tekan Ctrl+C untuk menyalin.");
  }
}

/*************************************************
 * CLEAR LIST
 *************************************************/

function clearList() {
  if (!scannedNumbers.length) return;

  if (!confirm("Hapus semua nomor PV dari daftar sementara?")) {
    return;
  }

  scannedNumbers = [];
  updateList();
  lastResult.hidden = true;
  setStatus("Daftar PV berhasil dihapus.");
}

/*************************************************
 * SOUND & VIBRATION
 *************************************************/

function beep() {
  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;

    oscillator.start();

    setTimeout(() => {
      oscillator.stop();
      audio.close();
    }, 100);
  } catch (error) {
    console.log("Audio tidak tersedia.");
  }
}

function vibrate() {
  if (navigator.vibrate) navigator.vibrate(100);
}

function vibrateError() {
  if (navigator.vibrate) navigator.vibrate([100, 60, 100]);
}

/*************************************************
 * EVENTS
 *************************************************/

startButton.addEventListener("click", startCamera);
scanButton.addEventListener("click", scanPV);
stopButton.addEventListener("click", stopCamera);

document.getElementById("copyButton")
  .addEventListener("click", copyList);

document.getElementById("clearButton")
  .addEventListener("click", clearList);

window.addEventListener("pagehide", stopCamera);

console.log("AP SCANNER PV ONLY READY");
