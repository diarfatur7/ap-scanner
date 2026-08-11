const WEBAPP_URL =
    "https://script.google.com/macros/s/AKfycbzg0Q5slomCGANi1AD6G4PRNmBOH154c7CZnjqosoU5O6znIlXcxKm3tytai6uD-wjcnA/exec";


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

const totalScan =
    document.getElementById("totalScan");

const successScan =
    document.getElementById("successScan");

const duplicateScan =
    document.getElementById("duplicateScan");


let total = 0;
let success = 0;
let duplicate = 0;


/************************************************************
 * START
 ************************************************************/

window.addEventListener(
    "load",
    startCamera
);


/************************************************************
 * STATUS
 ************************************************************/

function status(text){

    statusText.innerHTML = text;

}


/************************************************************
 * LOADING
 ************************************************************/

function showLoading(){

    loading.style.display =
        "block";

}


function hideLoading(){

    loading.style.display =
        "none";

}


/************************************************************
 * CAMERA
 ************************************************************/

async function startCamera(){

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){

        status(
            "❌ Browser tidak mendukung kamera"
        );

        return;

    }


    try{

        const stream =
            await navigator
                .mediaDevices
                .getUserMedia({

                    video:{

                        facingMode:{
                            ideal:"environment"
                        },

                        width:{
                            ideal:1280
                        },

                        height:{
                            ideal:720
                        }

                    },

                    audio:false

                });


        video.srcObject =
            stream;


        await video.play();


        status(
            "✅ Kamera siap — arahkan nomor AP ke kotak"
        );


    }catch(err){

        console.error(
            "CAMERA ERROR:",
            err
        );

        status(
            "❌ Kamera gagal dibuka"
        );

    }

}


/************************************************************
 * FAST IMAGE CROP
 *
 * Hanya mengambil area tengah kamera.
 ************************************************************/

function captureCrop(){

    const videoWidth =
        video.videoWidth;

    const videoHeight =
        video.videoHeight;


    if(
        !videoWidth ||
        !videoHeight
    ){

        throw new Error(
            "Kamera belum siap"
        );

    }


    /*
     * Area crop:
     *
     * X = 8%
     * Y = 35%
     * W = 84%
     * H = 30%
     *
     * Sesuai kotak hijau di layar.
     */


    const cropX =
        Math.round(
            videoWidth * 0.08
        );


    const cropY =
        Math.round(
            videoHeight * 0.35
        );


    const cropWidth =
        Math.round(
            videoWidth * 0.84
        );


    const cropHeight =
        Math.round(
            videoHeight * 0.30
        );


    /*
     * Batasi lebar gambar
     * agar upload lebih ringan.
     */

    const maxWidth = 1000;


    const scale =
        Math.min(
            1,
            maxWidth / cropWidth
        );


    canvas.width =
        Math.round(
            cropWidth * scale
        );


    canvas.height =
        Math.round(
            cropHeight * scale
        );


    const ctx =
        canvas.getContext(
            "2d"
        );


    ctx.drawImage(

        video,

        cropX,
        cropY,

        cropWidth,
        cropHeight,

        0,
        0,

        canvas.width,
        canvas.height

    );


    /*
     * JPEG 70%
     */

    return canvas
        .toDataURL(
            "image/jpeg",
            0.70
        )
        .replace(
            /^data:image\/jpeg;base64,/,
            ""
        );

}


/************************************************************
 * SCAN
 ************************************************************/

async function scan(){

    scanBtn.disabled =
        true;


    total++;

    totalScan.innerText =
        total;


    hasil.innerHTML =
        "-";


    showLoading();


    status(
        "📷 Mengambil area nomor AP..."
    );


    try{


        /****************************************************
         * CAPTURE CROP
         ****************************************************/

        const image =
            captureCrop();


        console.log(
            "Image size:",
            image.length
        );


        status(
            "☁ Mengirim ke OCR..."
        );


        /****************************************************
         * REQUEST
         ****************************************************/

        const response =
            await fetch(

                WEBAPP_URL,

                {

                    method:
                        "POST",

                    redirect:
                        "follow",

                    headers:{

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify({

                            image:
                                image

                        })

                }

            );


        console.log(
            "HTTP:",
            response.status
        );


        const responseText =
            await response.text();


        console.log(
            "Response:",
            responseText
        );


        /****************************************************
         * PARSE
         ****************************************************/

        let json;


        try{

            json =
                JSON.parse(
                    responseText
                );

        }catch(err){

            throw new Error(
                "Response server tidak valid"
            );

        }


        /****************************************************
         * BERHASIL
         ****************************************************/

        if(
            json.success
        ){

            success++;


            successScan.innerText =
                success;


            hasil.innerHTML =
                json.nomor;


            status(
                "✅ " +
                json.message
            );


            playBeep();

            vibrate();


        }else{


            /************************************************
             * DUPLIKAT
             ************************************************/

            if(
                json.message &&
                json.message
                    .toLowerCase()
                    .includes(
                        "sudah pernah"
                    )
            ){

                duplicate++;


                duplicateScan.innerText =
                    duplicate;


                hasil.innerHTML =
                    json.nomor ||
                    "-";


                status(
                    "⚠️ " +
                    json.message
                );


                playBeep();


            }else{


                hasil.innerHTML =
                    "-";


                status(
                    "❌ " +
                    (
                        json.message ||
                        "Nomor AP tidak ditemukan"
                    )
                );

            }

        }


    }catch(err){

        console.error(
            "SCAN ERROR:",
            err
        );


        hasil.innerHTML =
            "-";


        status(
            "❌ " +
            err.message
        );


    }finally{


        hideLoading();


        scanBtn.disabled =
            false;


        /*
         * Fokus kembali ke tombol.
         */

        scanBtn.focus();

    }

}


/************************************************************
 * BEEP
 ************************************************************/

function playBeep(){

    try{

        const audio =
            new Audio(
                "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
            );


        audio.volume =
            0.8;


        audio.play()
            .catch(
                () => {}
            );


    }catch(e){

        console.log(
            e
        );

    }

}


/************************************************************
 * VIBRATION
 ************************************************************/

function vibrate(){

    if(
        navigator.vibrate
    ){

        navigator.vibrate(
            150
        );

    }

}
