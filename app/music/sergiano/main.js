    const mainVid = document.getElementById('main-vid');
    const overlay = document.getElementById('image-overlay');
    const fullImg = document.getElementById('full-img');
    const statusTag = document.getElementById('status');
    let videoLibrary = [];
    let currentIndex = 0;

    document.getElementById('img-file').addEventListener('change', function(e) {
        if(e.target.files[0]) {
            const url = URL.createObjectURL(e.target.files[0]);
            fullImg.src = url;
            overlay.style.display = 'flex';
        }
    });

    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 'z') {
            if(fullImg.src) overlay.style.display = (overlay.style.display === 'flex') ? 'none' : 'flex';
        }
    });

    document.getElementById('files').addEventListener('change', function(e) {
        Array.from(e.target.files).forEach(file => {
            videoLibrary.push({ name: file.name, src: URL.createObjectURL(file) });
        });
        render();
    });

    function render() {
        const grid = document.getElementById('grid');
        const side = document.getElementById('side-list');
        grid.innerHTML = ''; side.innerHTML = '';
        
        videoLibrary.forEach((v, i) => {
            grid.innerHTML += `
                <div class="card" onclick="load(${i})">
                    <div style="height:80px; background:#001a33; display:flex; align-items:center; justify-content:center; font-size:20px; color:rgba(0,242,255,0.3);">▶</div>
                    <div style="padding:10px; font-size:10px; white-space:nowrap; overflow:hidden;">${v.name}</div>
                </div>`;
            
            const activeClass = (i === currentIndex && playerViewActive()) ? 'active-track' : '';
            side.innerHTML += `<div class="mini-card ${activeClass}" onclick="load(${i})">${i+1}. ${v.name}</div>`;
        });
    }

    function load(i) {
        if (!videoLibrary[i]) return;
        currentIndex = i;
        mainVid.src = videoLibrary[i].src;
        document.getElementById('home-view').style.display = 'none';
        document.getElementById('player-view').style.display = 'flex';
        mainVid.play();
        render();
    }

    function nextTrack() {
        if (videoLibrary.length > 0) {
            const btnNext = document.getElementById('next-btn');
            
            // Efecto visual tipo Mute al hacer clic
            btnNext.classList.add('btn-flash');
            setTimeout(() => btnNext.classList.remove('btn-flash'), 200);

            currentIndex = (currentIndex + 1) % videoLibrary.length;
            load(currentIndex);
        }
    }

    function toggleMute() {
        mainVid.muted = !mainVid.muted;
        const btn = document.getElementById('mute-btn');
        btn.innerText = mainVid.muted ? "MUTE: ON" : "MUTE: OFF";
        // Estilo persistente para Mute
        btn.style.borderColor = mainVid.muted ? "var(--glitch-red)" : "var(--hacker)";
        btn.style.color = mainVid.muted ? "var(--glitch-red)" : "var(--hacker)";
    }

    function toggleLoop() {
        mainVid.loop = !mainVid.loop;
        document.getElementById('loop-btn').innerText = mainVid.loop ? "BUCLE: ON" : "BUCLE: OFF";
        document.getElementById('loop-btn').style.color = mainVid.loop ? "var(--gold)" : "var(--hacker)";
        document.getElementById('loop-btn').style.borderColor = mainVid.loop ? "var(--gold)" : "var(--hacker)";
    }

    function closePlayer() {
        mainVid.pause();
        document.getElementById('player-view').style.display = 'none';
        document.getElementById('home-view').style.display = 'block';
    }

    function playerViewActive() {
        return document.getElementById('player-view').style.display === 'flex';
    }

    mainVid.onplay = () => { statusTag.innerText = "EJECUTANDO..."; statusTag.style.color = "var(--hacker)"; };
    mainVid.onpause = () => { statusTag.innerText = "PAUSADO"; statusTag.style.color = "var(--gold)"; };
    mainVid.onended = () => { if(!mainVid.loop) nextTrack(); };