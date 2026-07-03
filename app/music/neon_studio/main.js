   const video = document.getElementById('v-player'), playBtn = document.getElementById('play-btn');
   const pFill = document.getElementById('p-fill'), vCircle = document.getElementById('v-circle');
   let db = {"Principal": []}, currentDir = "Principal", idx = 0, currentSongName = "";
   let isShuffle = false;
   let audioCtx, analyser, source, data, gainNode, limiter, bassFilter, idbInstance;


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
       await new Promise(r => {
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
       if(audioCtx) return;
       audioCtx = new (window.AudioContext || window.webkitAudioContext)();
       source = audioCtx.createMediaElementSource(video);
       gainNode = audioCtx.createGain();
       analyser = audioCtx.createAnalyser();
       limiter = audioCtx.createDynamicsCompressor();
      
       limiter.threshold.setValueAtTime(-0.5, audioCtx.currentTime);
       limiter.knee.setValueAtTime(0, audioCtx.currentTime);
       limiter.ratio.setValueAtTime(20, audioCtx.currentTime);
       limiter.attack.setValueAtTime(0.001, audioCtx.currentTime);
       limiter.release.setValueAtTime(0.1, audioCtx.currentTime);


       bassFilter = audioCtx.createBiquadFilter();
       bassFilter.type = "lowshelf"; bassFilter.frequency.value = 200;
      
       analyser.fftSize = 128; data = new Uint8Array(analyser.frequencyBinCount);
       source.connect(bassFilter).connect(gainNode).connect(limiter).connect(analyser).connect(audioCtx.destination);
       loop();
   }


   function loop() {
       requestAnimationFrame(loop);
       if(!analyser) return;
       analyser.getByteFrequencyData(data);
       const bass = data.slice(0, 5).reduce((a,b)=>a+b)/5;
       const mid = data.slice(10, 30).reduce((a,b)=>a+b)/20;
       const high = data.slice(40, 60).reduce((a,b)=>a+b)/20;
      
       const r = Math.min(255, bass * 2.2), g = Math.min(255, mid * 2), b = Math.min(255, high * 4.5);
       const dynamicColor = `rgb(${r}, ${g}, ${b})`;
      
       document.documentElement.style.setProperty('--dynamic-color', dynamicColor);
       vCircle.style.transform = `scale(${1 + (bass / 450)})`;
       document.body.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.12) 0%, #010409 100%)`;


       if (video.currentTime > 5 && Math.random() < 0.01) saveFile({name: currentSongName}, dynamicColor);
       if (video.duration) pFill.style.width = (video.currentTime / video.duration) * 100 + "%";
   }


   async function load(i) {
       if (!db[currentDir][i]) return;
       idx = i;
       const t = db[currentDir][i];
       const entry = await getFile(t.name);
       if(!entry) return;


       currentSongName = t.name;
       if(entry.color) document.documentElement.style.setProperty('--dynamic-color', entry.color);
       if(video.src) URL.revokeObjectURL(video.src);
      
       video.src = URL.createObjectURL(entry.data);
       document.getElementById('playing-title').innerText = t.name;
       startAudio();
       video.play();
       playBtn.innerText = "PAUSE";
       render();
   }


   async function processFiles(files) {
       const title = document.getElementById('playing-title');
       const originalText = title.innerText;
       let count = 0;
       for(let f of Array.from(files)) {
           if(f.type.startsWith('audio/') || f.type.startsWith('video/')) {
               count++;
               title.innerText = `IMPORTANDO: ${count}/${files.length}`;
               await saveFile(f);
               if(!db[currentDir].find(t => t.name === f.name)) {
                   db[currentDir].push({ name: f.name });
               }
           }
       }
       title.innerText = originalText;
       render();
   }


   // Shuffle & Logic
   function toggleShuffle() {
       isShuffle = !isShuffle;
       const btn = document.getElementById('shuffle-btn');
       btn.innerText = isShuffle ? "SHUFFLE: ON" : "SHUFFLE: OFF";
       btn.classList.toggle('active-toggle', isShuffle);
   }


   function changeTrack(d) {
       if(db[currentDir].length === 0) return;
       if(isShuffle) {
           idx = Math.floor(Math.random() * db[currentDir].length);
       } else {
           idx = (idx + d + db[currentDir].length) % db[currentDir].length;
       }
       load(idx);
   }


   // Drag & Drop
   const body = document.body;
   body.ondragover = (e) => { e.preventDefault(); body.classList.add('drag-over'); };
   body.ondragleave = () => body.classList.remove('drag-over');
   body.ondrop = async (e) => {
       e.preventDefault();
       body.classList.remove('drag-over');
       await processFiles(e.dataTransfer.files);
   };


   document.getElementById('file-up').onchange = async function() {
       await processFiles(this.files);
   };


   async function deleteTrack(name, e) {
       e.stopPropagation();
       if(!confirm(`¿Eliminar permanentemente ${name}?`)) return;
       db[currentDir] = db[currentDir].filter(t => t.name !== name);
       const tx = idbInstance.transaction("songs", "readwrite");
       tx.objectStore("songs").delete(name);
       render();
   }


   function render() {
       document.getElementById('folders').innerHTML = Object.keys(db).map(n => `<div class="folder-item ${n === currentDir ? 'active' : ''}" onclick="setDir('${n}')">📂 ${n} (${db[n].length})</div>`).join('');
       const searchVal = document.getElementById('search-in').value.toLowerCase();
       const tracksHtml = db[currentDir].map((t, i) => {
           if(!t.name.toLowerCase().includes(searchVal)) return '';
           return `<div class="song-item" onclick="load(${i})">
               <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${t.name}</span>
               <div><span class="del-btn" onclick="deleteTrack('${t.name}', event)">✕</span></div>
           </div>`;
       }).join('');
       document.getElementById('tracks').innerHTML = tracksHtml;
       localStorage.setItem('neon_smart_data', JSON.stringify({ db, currentDir }));
   }


   video.onended = () => changeTrack(1);
   document.getElementById('b-slider').oninput = e => {
       const v = parseFloat(e.target.value);
       if(gainNode) gainNode.gain.setTargetAtTime(v, audioCtx.currentTime, 0.01);
       document.getElementById('b-num').innerText = Math.round(v * 100) + "%";
   };
   playBtn.onclick = () => {
       startAudio();
       video.paused ? video.play() : video.pause();
       playBtn.innerText = video.paused ? "PLAY" : "PAUSE";
   };
   function setDir(n) { currentDir = n; render(); }
   function addFolder() {
       const v = document.getElementById('folder-in').value;
       if(v && !db[v]) { db[v] = []; render(); document.getElementById('folder-in').value = ''; }
   }
   function clearDB() { if(confirm("¿BORRAR TODO?")) { indexedDB.deleteDatabase("NeonSmartMemory"); localStorage.clear(); location.reload(); } }
  
   window.onload = async () => {
       await initDB();
       const s = localStorage.getItem('neon_smart_data');
       if(s) { const p = JSON.parse(s); db = p.db; currentDir = p.currentDir; }
       render();
   };