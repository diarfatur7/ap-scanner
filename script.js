/************************************************************
 * AP SCANNER
 * Frontend - GitHub Pages
 ************************************************************/


/************************************************************
 * GOOGLE APPS SCRIPT WEB APP
 ************************************************************/

const WEBAPP_URL =
    "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


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

window.addEventListener("load", function () {

    startCamera();

});


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


        status(
            "✅ Kamera Aktif"
        );


    } catch (err) {

        console.error(
            "CAMERA ERROR:",
            err
        );

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


    /********************************************************
     * LOCK BUTTON
     ********************************************************/

    scanBtn.disabled = true;

    showLoading();

    hasil.innerHTML = "-";


    status(
        "📷 Mengambil gambar..."
    );


    /********************************************************
     * CEK KAMERA
     ********************************************************/

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


    /********************************************************
     * SET CANVAS
     ********************************************************/

    canvas.width =
        video.videoWidth;

    canvas.height =
        video.videoHeight;


    /********************************************************
     * AMBIL FRAME KAMERA
     ********************************************************/

    const ctx =
        canvas.getContext("2d");

    ctx.drawImage(

        video,

        0,

        0,

        canvas.width,

        canvas.height

    );


    /********************************************************
     * CONVERT KE BASE64
     ********************************************************/

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


    console.log(
        "Image size:",
        image.length
    );


    status(
        "☁ Mengirim gambar ke Apps Script..."
    );


    /********************************************************
     * KIRIM KE APPS SCRIPT
     ********************************************************/

    try {


        console.log(
            "Mengirim POST ke:",
            WEBAPP_URL
        );


        const response =
            await fetch(

                WEBAPP_URL,

                {

                    method: "POST",

                    /*
                     * Ikuti redirect dari Apps Script
                     */

                    redirect: "follow",

                    /*
                     * text/plain dipakai agar browser
                     * tidak melakukan preflight JSON.
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


        /********************************************************
         * HTTP RESPONSE
         ********************************************************/

        console.log(
            "HTTP STATUS:",
            response.status
        );


        console.log(
            "RESPONSE URL:",
            response.url
        );


        /********************************************************
         * BACA RESPONSE
         ********************************************************/

        const responseText =
            await response.text();


        console.log(
            "APPS SCRIPT RESPONSE:",
            responseText
        );


        /********************************************************
         * RESPONSE KOSONG
         ********************************************************/

        if (!responseText) {

            throw new Error(
                "Response Apps Script kosong"
            );

        }


        /********************************************************
         * PARSE JSON
         ********************************************************/

        let json;


        try {

            json =
                JSON.parse(
                    responseText
                );

        } catch (parseError) {

            console.error(
                "JSON PARSE ERROR:",
                parseError
            );

            console.error(
                "RAW RESPONSE:",
                responseText
            );

            throw new Error(
                "Response Apps Script bukan JSON"
            );

        }


        console.log(
            "JSON RESULT:",
            json
        );


        /********************************************************
         * CEK HASIL
         ********************************************************/

        if (json.success) {


            /****************************************************
             * NOMOR AP BERHASIL DITEMUKAN
             ****************************************************/

            hasil.innerHTML =
                json.nomor;


            status(
                "✅ " +
                json.message
            );


            playBeep();

            vibrate();


        } else {


            /****************************************************
             * ERROR DARI APPS SCRIPT
             ****************************************************/

            hasil.innerHTML =
                "-";


            status(
                "❌ " +
                (
                    json.message ||
                    "Nomor AP tidak ditemukan"
                )
            );


            console.error(
                "APPS SCRIPT ERROR:",
                json
            );

        }


    } catch (err) {


        /********************************************************
         * FETCH ERROR
         ********************************************************/

        console.error(
            "FETCH ERROR:",
            err
        );


        hasil.innerHTML =
            "-";


        status(
            "❌ Gagal terhubung ke Apps Script"
        );


    } finally {


        /********************************************************
         * UNLOCK
         ********************************************************/

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

        audio.play()
            .catch(function (err) {

                console.log(
                    "Audio autoplay blocked:",
                    err
                );

            });

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
