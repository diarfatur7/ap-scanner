// =====================================================
// AP SCANNER
// =====================================================

const API_URL =
  "ISI_URL_WEB_APP_APPS_SCRIPT_KAMU";


// =====================================================
// ELEMENT
// =====================================================

const video =
  document.getElementById("video");

const canvas =
  document.getElementById("captureCanvas");

const startCamera =
  document.getElementById("startCamera");

const scanNumber =
  document.getElementById("scanNumber");

const scanVendor =
  document.getElementById("scanVendor");

const saveButton =
  document.getElementById("saveButton");

const nomorDokumen =
  document.getElementById("nomorDokumen");

const vendor =
  document.getElementById("vendor");

const statusBox =
  document.getElementById("status");

const ocrPreview =
  document.getElementById("ocrPreview");

const rawOCR =
  document.getElementById("rawOCR");


// =====================================================
// CAMERA
// =====================================================

let stream = null;


async function startCameraFunction() {

  try {

    if (stream) {

      stream.getTracks().forEach(
        track => track.stop()
      );

    }

    stream =
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


    video.srcObject = stream;

    await video.play();


    scanNumber.disabled = false;
    scanVendor.disabled = false;


    setStatus(
      "Kamera aktif. Arahkan nomor ke kotak hijau."
    );


  } catch (error) {

    console.error(error);

    setStatus(
      "Kamera gagal dibuka: " +
      error.message
    );

  }

}


startCamera.addEventListener(
  "click",
  startCameraFunction
);


// =====================================================
// STATUS
// =====================================================

function setStatus(message) {

  statusBox.textContent = message;

}


// =====================================================
// CROP
// =====================================================

function captureCrop(mode) {

  if (!video.videoWidth || !video.videoHeight) {

    throw new Error(
      "Kamera belum siap."
    );

  }


  const videoWidth =
    video.videoWidth;

  const videoHeight =
    video.videoHeight;


  // Posisi frame mengikuti CSS:
  //
  // left  = 7%
  // right = 7%
  // top   = 36%
  // height= 28%


  let x =
    videoWidth * 0.07;

  let y =
    videoHeight * 0.36;

  let width =
    videoWidth * 0.86;

  let height =
    videoHeight * 0.28;


  // Untuk nomor, crop sedikit lebih lebar
  // dan diperbesar.

  if (mode === "number") {

    x =
      videoWidth * 0.04;

    y =
      videoHeight * 0.32;

    width =
      videoWidth * 0.92;

    height =
      videoHeight * 0.36;

  }


  // Pastikan tidak keluar frame

  x = Math.max(
    0,
    Math.floor(x)
  );

  y = Math.max(
    0,
    Math.floor(y)
  );

  width = Math.min(
    videoWidth - x,
    Math.floor(width)
  );

  height = Math.min(
    videoHeight - y,
    Math.floor(height)
  );


  // ===================================================
  // OUTPUT SIZE
  // ===================================================

  let scale = 1.5;

  if (mode === "number") {

    scale = 2.2;

  }


  canvas.width =
    Math.floor(width * scale);

  canvas.height =
    Math.floor(height * scale);


  const ctx =
    canvas.getContext("2d");


  ctx.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  // ===================================================
  // IMAGE PROCESSING
  // ===================================================

  if (mode === "number") {

    ctx.filter =
      "grayscale(100%) contrast(150%) brightness(105%)";

  } else {

    ctx.filter =
      "none";

  }


  ctx.drawImage(

    video,

    x,
    y,
    width,
    height,

    0,
    0,
    canvas.width,
    canvas.height

  );


  ctx.filter = "none";


  // ===================================================
  // TAMPILKAN GAMBAR ASLI YANG DIKIRIM OCR
  // ===================================================

  const previewData =
    canvas.toDataURL(
      "image/jpeg",
      0.90
    );


  ocrPreview.src =
    previewData;

  ocrPreview.style.display =
    "block";


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
    "CROP:",
    x,
    y,
    width,
    height
  );

  console.log(
    "OUTPUT:",
    canvas.width,
    canvas.height
  );


  return previewData;

}


// =====================================================
// CONVERT DATA URL → BLOB
// =====================================================

function dataURLtoBlob(dataURL) {

  const parts =
    dataURL.split(",");

  const mime =
    parts[0]
      .match(/:(.*?);/)[1];

  const binary =
    atob(parts[1]);

  const array =
    new Uint8Array(
      binary.length
    );


  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    array[i] =
      binary.charCodeAt(i);

  }


  return new Blob(
    [array],
    {
      type: mime
    }
  );

}


// =====================================================
// SEND OCR
// =====================================================

async function sendOCR(
  imageData,
  mode
) {

  setStatus(
    "⏳ Sedang membaca..."
  );


  const blob =
    dataURLtoBlob(imageData);


  const base64 =
    await blobToBase64(blob);


  const payload = {

    action: "scan",

    mode: mode,

    image: base64

  };


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {

            "Content-Type":
              "text/plain;charset=utf-8"

          },

          body:
            JSON.stringify(payload)

        }
      );


    const text =
      await response.text();


    console.log(
      "SERVER RESPONSE:",
      text
    );


    let result;


    try {

      result =
        JSON.parse(text);

    } catch (e) {

      throw new Error(
        "Response bukan JSON: " +
        text
      );

    }


    // =================================================
    // RAW OCR
    // =================================================

    rawOCR.textContent =
      result.rawText ||
      result.text ||
      "Tidak ada raw OCR.";


    // =================================================
    // NOMOR
    // =================================================

    if (
      mode === "number"
    ) {

      if (
        result.success &&
        result.nomorDokumen
      ) {

        nomorDokumen.value =
          result.nomorDokumen;


        setStatus(
          "✅ Nomor terbaca: " +
          result.nomorDokumen
        );

      } else {

        setStatus(
          "❌ Nomor tidak terbaca. Lihat gambar crop di bawah."
        );

      }

    }


    // =================================================
    // VENDOR
    // =================================================

    if (
      mode === "vendor"
    ) {

      if (
        result.success &&
        result.vendor
      ) {

        vendor.value =
          result.vendor;


        setStatus(
          "✅ Vendor terbaca: " +
          result.vendor
        );

      } else {

        setStatus(
          "❌ Vendor tidak terbaca."
        );

      }

    }


    return result;


  } catch (error) {

    console.error(error);


    setStatus(
      "❌ Error: " +
      error.message
    );

  }

}


// =====================================================
// BLOB → BASE64
// =====================================================

function blobToBase64(blob) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();


      reader.onloadend =
        () => {

          const result =
            reader.result;

          const base64 =
            result.split(",")[1];

          resolve(base64);

        };


      reader.onerror =
        reject;


      reader.readAsDataURL(blob);

    }
  );

}


// =====================================================
// SCAN NOMOR
// =====================================================

async function scanNomor() {

  try {

    setStatus(
      "📷 Mengambil gambar nomor..."
    );


    const image =
      captureCrop(
        "number"
      );


    await sendOCR(
      image,
      "number"
    );


  } catch (error) {

    console.error(error);

    setStatus(
      "❌ " +
      error.message
    );

  }

}


scanNumber.addEventListener(
  "click",
  scanNomor
);


// =====================================================
// SCAN VENDOR
// =====================================================

async function scanVendorFunction() {

  try {

    setStatus(
      "📷 Mengambil gambar vendor..."
    );


    const image =
      captureCrop(
        "vendor"
      );


    await sendOCR(
      image,
      "vendor"
    );


  } catch (error) {

    console.error(error);

    setStatus(
      "❌ " +
      error.message
    );

  }

}


scanVendor.addEventListener(
  "click",
  scanVendorFunction
);


// =====================================================
// SAVE
// =====================================================

saveButton.addEventListener(
  "click",
  async () => {

    const nomor =
      nomorDokumen.value.trim();

    const namaVendor =
      vendor.value.trim();


    if (!nomor) {

      setStatus(
        "⚠️ Nomor dokumen belum diisi."
      );

      return;

    }


    if (!namaVendor) {

      setStatus(
        "⚠️ Vendor belum diisi."
      );

      return;

    }


    setStatus(
      "⏳ Menyimpan..."
    );


    try {

      const response =
        await fetch(
          API_URL,
          {

            method: "POST",

            headers: {

              "Content-Type":
                "text/plain;charset=utf-8"

            },

            body:
              JSON.stringify({

                action: "finalize",

                nomorDokumen:
                  nomor,

                vendor:
                  namaVendor

              })

          }
        );


      const result =
        await response.json();


      if (
        result.success
      ) {

        setStatus(
          "✅ Berhasil disimpan."
        );

      } else {

        setStatus(
          "❌ " +
          (
            result.message ||
            "Gagal menyimpan."
          )
        );

      }


    } catch (error) {

      console.error(error);

      setStatus(
        "❌ Gagal menyimpan: " +
        error.message
      );

    }

  }
);
