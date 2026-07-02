   const video = document.getElementById('v-player');
        const playBtn = document.getElementById('play-btn');
        const pFill = document.getElementById('p-fill');
        const pBar = document.getElementById('p-bar');
        const canvas = document.getElementById('viz-canvas');
        const ctx = canvas.getContext('2d');
        const volSlider = document.getElementById('vol-slider');

        let db = { "/": [] }, currentDir = "/", idx = 0, currentSongName = "";
        let isShuffle = false;
        let audioCtx, analyser, source, data, gainNode, idbInstance;
        let objectUrl = null; // Para limpiar memoria

        // Ajustar Canvas
        function resizeCanvas() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        async function initDB() {
            return new Promise(r => {
                const req = indexedDB.open("NeonSmartMemory", 2);
                req.onupgradeneeded = e => {
                    const s = e.target.result.createObjectStore("songs", { keyPath: "name" });
                    s.createIndex("color", "color", { unique: false });
                };
                req.onsuccess = e => { idbInstance = e.target.result; r(); };
            });
        }

        async function saveFile(f, color = null) {
            if (!f.name) return;
            const tx = idbInstance.transaction("songs", "readwrite");
            const store = tx.objectStore("songs");
            const existing = await new Promise(r => {
                const req = store.get(f.name);
                req.onsuccess = () => r(req.result);
            });
            const dataToSave = existing ? { ...existing, color: color || existing.color } : { name: f.name, data: f, color: "rgb(0, 242, 255)" };
            return new Promise(r => {
                const req = store.put(dataToSave);
                req.onsuccess = () => r();
            });
        }

        async function getFile(n) {
            return new Promise(r => {
                idbInstance.transaction("songs").objectStore("songs").get(n).onsuccess = e => r(e.target.result);
            });
        }

        function startAudio() {
            if (audioCtx) return;
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            source = audioCtx.createMediaElementSource(video);
            gainNode = audioCtx.createGain();
            analyser = audioCtx.createAnalyser();

            gainNode.gain.value = volSlider.value; // Inicializar volumen

            analyser.fftSize = 256;
            data = new Uint8Array(analyser.frequencyBinCount);

            source.connect(gainNode).connect(analyser).connect(audioCtx.destination);
            loop();
        }

        function loop() {
            requestAnimationFrame(loop);
            if (!analyser) return;

            analyser.getByteFrequencyData(data);

            // Colores dinámicos
            const bass = data.slice(0, 5).reduce((a, b) => a + b) / 5;
            const mid = data.slice(10, 30).reduce((a, b) => a + b) / 20;
            const high = data.slice(40, 60).reduce((a, b) => a + b) / 20;

            const r = Math.min(255, bass * 2.2), g = Math.min(255, mid * 2), b = Math.min(255, high * 4.5);
            const dynamicColor = `rgb(${r}, ${g}, ${b})`;

            document.documentElement.style.setProperty('--dynamic-color', dynamicColor);
            document.body.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.12) 0%, #010409 100%)`;

            // Dibujar Ecualizador en Canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / analyser.frequencyBinCount) * 2.5;
            let x = 0;

            for (let i = 0; i < analyser.frequencyBinCount; i++) {
                const barHeight = (data[i] / 255) * canvas.height;
                ctx.fillStyle = dynamicColor;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }

            if (video.currentTime > 5 && Math.random() < 0.01) saveFile({ name: currentSongName }, dynamicColor);
            if (video.duration) pFill.style.width = (video.currentTime / video.duration) * 100 + "%";
        }

        async function load(i) {
            if (!db[currentDir][i]) return;
            idx = i;
            const t = db[currentDir][i];
            const entry = await getFile(t.name);
            if (!entry) return;

            currentSongName = t.name;
            if (entry.color) document.documentElement.style.setProperty('--dynamic-color', entry.color);

            // Limpiar memoria
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            objectUrl = URL.createObjectURL(entry.data);
            video.src = objectUrl;

            document.getElementById('playing-title').innerText = t.name;

            // Media Session API para teclado multimedia/notificaciones
            if ('mediaSession' in navigator) {
                navigator.mediaSession.metadata = new MediaMetadata({ title: t.name, artist: 'COBALT ®øÐ®ıªnФ BRØ' });
                navigator.mediaSession.setActionHandler('previoustrack', () => changeTrack(-1));
                navigator.mediaSession.setActionHandler('nexttrack', () => changeTrack(1));
            }

            startAudio();
            video.play();
            playBtn.innerText = "PAUSE";
            render();
        }

        function togglePlay() {
            startAudio();
            if (video.paused) { video.play(); playBtn.innerText = "PAUSE"; }
            else { video.pause(); playBtn.innerText = "PLAY"; }
        }

        // Control de Volumen
        volSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            if (gainNode) gainNode.gain.value = vol;
            video.volume = vol; // Respaldo nativo
        });

        // Click en la barra para adelantar/atrasar
        function seek(e) {
            if (!video.duration) return;
            const rect = pBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            video.currentTime = pos * video.duration;
        }

        // Atajos de teclado
        window.addEventListener('keydown', (e) => {
            // Ignorar si el usuario está escribiendo en los inputs
            if (document.activeElement.tagName === 'INPUT') return;

            if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
            if (e.code === 'ArrowRight') { e.preventDefault(); changeTrack(1); }
            if (e.code === 'ArrowLeft') { e.preventDefault(); changeTrack(-1); }
            if (e.code === 'ArrowUp') { e.preventDefault(); volSlider.value = Math.min(1, parseFloat(volSlider.value) + 0.1); volSlider.dispatchEvent(new Event('input')); }
            if (e.code === 'ArrowDown') { e.preventDefault(); volSlider.value = Math.max(0, parseFloat(volSlider.value) - 0.1); volSlider.dispatchEvent(new Event('input')); }
        });

        async function processFiles(files) {
            const title = document.getElementById('playing-title');
            const originalText = title.innerText;
            let count = 0;
            for (let f of Array.from(files)) {
                if (f.type.startsWith('audio/') || f.type.startsWith('video/')) {
                    count++;
                    title.innerText = `COPYING... ${count}/${files.length}`;
                    await saveFile(f);
                    if (!db[currentDir].find(t => t.name === f.name)) {
                        db[currentDir].push({ name: f.name });
                    }
                }
            }
            title.innerText = originalText;
            render();
        }

        function toggleShuffle() {
            isShuffle = !isShuffle;
            const btn = document.getElementById('shuffle-btn');
            btn.innerText = isShuffle ? "SHUFFLE: ON" : "SHUFFLE: OFF";
            btn.classList.toggle('active-toggle', isShuffle);
        }

        function changeTrack(d) {
            if (db[currentDir].length === 0) return;
            if (isShuffle) {
                idx = Math.floor(Math.random() * db[currentDir].length);
            } else {
                idx = (idx + d + db[currentDir].length) % db[currentDir].length;
            }
            load(idx);
        }

        const body = document.body;
        body.ondragover = (e) => { e.preventDefault(); body.classList.add('drag-over'); };
        body.ondragleave = () => body.classList.remove('drag-over');
        body.ondrop = async (e) => {
            e.preventDefault();
            body.classList.remove('drag-over');
            await processFiles(e.dataTransfer.files);
        };

        document.getElementById('file-up').onchange = async function () {
            await processFiles(this.files);
        };

        async function deleteTrack(name, e) {
            e.stopPropagation();
            if (!confirm(`¿Eliminar permanentemente ${name}?`)) return;
            db[currentDir] = db[currentDir].filter(t => t.name !== name);
            const tx = idbInstance.transaction("songs", "readwrite");
            tx.objectStore("songs").delete(name);
            render();
        }

        function render() {
            document.getElementById('folders').innerHTML = Object.keys(db).map(n => `<div class="folder-item ${n === currentDir ? 'active' : ''}" onclick="setDir('${n}')">📂 ${n} (${db[n].length})</div>`).join('');
            const searchVal = document.getElementById('search-in').value.toLowerCase();
            const tracksHtml = db[currentDir].map((t, i) => {
                if (!t.name.toLowerCase().includes(searchVal)) return '';
                return `<div class="song-item" onclick="load(${i})">
               <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${t.name}</span>
               <div><span class="del-btn" onclick="deleteTrack('${t.name}', event)">✕</span></div>
           </div>`;
            }).join('');
            document.getElementById('tracks').innerHTML = tracksHtml;
            localStorage.setItem('neon_smart_data', JSON.stringify({ db, currentDir }));
        }

        video.onended = () => changeTrack(1);

        function setDir(n) { currentDir = n; render(); }
        function addFolder() {
            const v = document.getElementById('folder-in').value;
            if (v && !db[v]) { db[v] = []; render(); document.getElementById('folder-in').value = ''; }
        }
        function clearDB() {
            if (confirm("¿BORRAR TODO?")) {
                indexedDB.deleteDatabase("NeonSmartMemory"); localStorage.clear(); location.reload();
            }
        }

        window.onload = async () => {
            await initDB();
            const s = localStorage.getItem('neon_smart_data');
            if (s) { const p = JSON.parse(s); db = p.db || { "/": [] }; currentDir = p.currentDir || "/"; }
            if (!db["/"]) db["/"] = []; // Fallback por si acaso
            render();
            resizeCanvas(); // Asegurar tamaño correcto al iniciar
        };
        // *** 🚀 INICIO: MOTOR DE EJECUCIÓN JS AUTOMÁTICO 🚀 ***

        // 1. Atajo oculto para configurar tu JS (Usa: Ctrl + Shift + J)
        window.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.code === 'KeyJ') {
                e.preventDefault(); // Bloquea la consola por defecto del navegador si coincide

                const _currentJS = localStorage.getItem('cobalt_auto_js') || '';
                const _newJS = prompt("⚡ INGRESA TU JS PARA EJECUCIÓN AUTOMÁTICA:\n(Deja el cuadro en blanco para desactivar y borrar)", _currentJS);

                if (_newJS !== null) {
                    if (_newJS.trim() === '') {
                        localStorage.removeItem('cobalt_auto_js');
                        alert("🗑️ Auto-Ejecución JS Desactivada.");
                    } else {
                        localStorage.setItem('cobalt_auto_js', _newJS);
                        alert("✅ JS Guardado. Se ejecutará automáticamente en el próximo inicio.");
                    }
                }
            }
        });

        // 2. Ejecutor silencioso que arranca automáticamente al cargar la interfaz
        window.addEventListener('DOMContentLoaded', () => {
            const _savedJS = localStorage.getItem('cobalt_auto_js');
            if (_savedJS) {
                try {
                    // Se utiliza new Function() por ser más seguro y limpio que eval()
                    new Function(_savedJS)();
                } catch (err) {
                    console.error("❌ Error en tu script personalizado:", err);
                }
            }
        });