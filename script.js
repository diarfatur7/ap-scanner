const WEBAPP_URL =
"https://script.google.com/macros/s/AKfycbzcMdWRsq1F_MNI2h1f0ybXFy_h4fYI5zjpxbrvQ0aBbe4pFt_ZvMOl07pOwR9qU6Yf9g/exec";

const video = document.getElementById("video");
const hasil = document.getElementById("hasil");
const statusText = document.getElementById("status");
const scanBtn = document.getElementById("scanBtn");
const canvas = document.getElementById("canvas");

window.onload = () => {
    startCamera();
};

function status(text){
    statusText.innerText = text;
}

async function startCamera(){

    try{

        const stream =
        await navigator.mediaDevices.getUserMedia({

            video:{
                facingMode:{
                    ideal:"environment"
                }
            },

            audio:false

        });

        video.srcObject = stream;

        await video.play();

        status("Kamera Aktif");

    }catch(err){

        console.error(err);

        alert(err.name + "\n" + err.message);

        status("Gagal membuka kamera");

    }

}
