/************************************************************
 * AP SCANNER
 * Frontend - GitHub Pages
 ************************************************************/


/*
 * URL WEB APP GOOGLE APPS SCRIPT
 *
 * Pastikan menggunakan URL /exec
 */
const WEBAPP_URL =
    "https://script.google.com/macros/s/AKfycbzqA2rJ8mwF4bQcgwzNgtfgM8NapRRQD5yiiA37YtVwqbqDsMXmQCacAOsb6q2Q0RsNkg/exec";


/************************************************************
 * ELEMENT HTML
 ************************************************************/

const video =
    document.getElementById("video");

const hasil =
    document.getElementById("hasil");

const statusText =
    document.getElementById("status");

const loading =
    document.getElementById("loading");

const scanBtn =
    document.getElementById("scanBtn");

const canvas =
    document.getElementById("canvas");


/************************************************************
 * SAAT HALAMAN DIBUKA
 ************************************************************/

window.onload = function () {

    startCamera();

};


/************************************************************
 * STATUS
 ************************************************************/

function status(text) {

    statusText.innerHTML = text;

}


/************************************************************
 * LOADING
 ************************************************************/

function showLoading() {

    loading.style.display = "block";

}


function hideLoading() {

    loading.style.display = "none";

}


/************************************************************
 * START CAMERA
 ************************************************************/

async function startCamera() {

    if (!navigator.mediaDevices) {

        status(
            "❌ Browser tidak mendukung kamera"
        );

        return;

    }


    try {

        const stream =
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


        status("✅ Kamera Aktif");


    } catch (err) {

        console.error(err);

        alert(
            err.name +
            "\n\n" +
            err.message
        );

        status(
            "❌ Gagal membuka kamera"
        );

    }

}


/************************************************************
 * SCAN
 ************************************************************/

async function scan() {

    scanBtn.disabled = true;

    showLoading();

    hasil.innerHTML = "-";

    status(
        "📷 Mengambil gambar..."
    );


    /*
     * Pastikan kamera sudah memiliki ukuran
     */

    if (
        !video.videoWidth ||
        !video.videoHeight
    ) {

        status(
            "❌ Kamera belum siap"
        );

        hideLoading();

        scanBtn.disabled = false;

        return;

    }


    /*
     * Ukuran canvas mengikuti kamera
     */

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;


    /*
     * Ambil frame kamera
     */

    const ctx =
        canvas.getContext("2d");

    ctx.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );


    /*
     * Convert gambar menjadi Base64
     */

    const image =
        canvas
            .toDataURL(
                "image/jpeg",
                0.9
            )
            .replace(
                /^data:image\/jpeg;base64,/,
                ""
            );


    status(
        "☁ Mengirim gambar ke server..."
    );


    try {


        /****************************************************
         * KIRIM KE GOOGLE APPS SCRIPT
         ****************************************************/

        const response =
            await fetch(

                WEBAPP_URL,

                {

                    method: "POST",

                    /*
                     * text/plain digunakan supaya request
                     * tidak membutuhkan preflight JSON.
                     */

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify({

                            image: image

                        })

                }

            );


        console.log(
            "HTTP Status:",
            response.status
        );


        /*
         * Baca response
         */

        const responseText =
            await response.text();


        console.log(
            "Response Apps Script:",
            responseText
        );


        /*
         * Coba ubah response menjadi JSON
         */

        let json;


        try {

            json =
                JSON.parse(
                    responseText
                );

        } catch (parseError) {

            console.error(
                "JSON Parse Error:",
                parseError
            );

            status(
                "❌ Response server tidak valid"
            );

            hasil.innerHTML = "-";

            return;

        }


        /****************************************************
         * HASIL DARI APPS SCRIPT
         ****************************************************/

        if (json.success) {


            /*
             * Nomor AP ditemukan
             */

            hasil.innerHTML =
                json.nomor;


            status(
                "✅ " +
                json.message
            );


            playBeep();

            vibrate();


        } else {


            /*
             * Nomor tidak ditemukan
             * atau terjadi error
             */

            hasil.innerHTML = "-";

            status(
                "❌ " +
                (
                    json.message ||
                    "Nomor AP tidak ditemukan"
                )
            );

        }


    } catch (err) {


        console.error(
            "FETCH ERROR:",
            err
        );


        hasil.innerHTML = "-";


        status(
            "❌ Gagal terhubung ke Apps Script"
        );


    } finally {


        hideLoading();

        scanBtn.disabled = false;

    }

}


/************************************************************
 * BEEP
 ************************************************************/

function playBeep() {

    try {

        const audio =
            new Audio(
                "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
            );

        audio.volume = 1;

        audio.play();

    } catch (e) {

        console.log(
            "Audio error:",
            e
        );

    }

}


/************************************************************
 * VIBRATION
 ************************************************************/

function vibrate() {

    if (
        navigator.vibrate
    ) {

        navigator.vibrate(200);

    }

}


/************************************************************
 * BUTTON
 ************************************************************/

scanBtn.addEventListener(
    "click",
    scan
);
