const WEBAPP_URL =
"https://script.google.com/macros/s/AKfycbzqA2rJ8mwF4bQcgwzNgtfgM8NapRRQD5yiiA37YtVwqbqDsMXmQCacAOsb6q2Q0RsNkg/exec";

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

async function scan(){

    scanBtn.disabled = true;

    status("Mengambil gambar...");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    function playBeep(){

    try{

        const audio = new Audio(
        "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg"
        );

        audio.play();

    }catch(e){

        console.log(e);

    }

}

function vibrate(){

    if(navigator.vibrate){

        navigator.vibrate(200);

    }

}

    const base64 = canvas
        .toDataURL("image/jpeg",0.9)
        .replace(/^data:image\/jpeg;base64,/,"");

    status("Mengirim ke OCR...");

    try{

        const response = await fetch(WEBAPP_URL,{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                image:base64

            })

        });

        alert("Status : " + response.status);

        const text = await response.text();

        alert(text);

        return;

        const json = await response.json();

        console.log(json);

        if(json.success){

            hasil.innerHTML = json.nomor;

            status(json.message);

            playBeep();

            vibrate();

        }else{

            hasil.innerHTML = "-";

            status(json.message);

        }

    }catch(err){

        console.error(err);

        hasil.innerHTML = "-";

        status("Gagal terhubung ke Apps Script");

    }

    scanBtn.disabled = false;

}
