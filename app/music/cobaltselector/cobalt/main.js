    const grid = document.getElementById('grid'), sideList = document.getElementById('side-list'),
         mainVid = document.getElementById('main-vid'), playerView = document.getElementById('player-view'),
         homeView = document.getElementById('home-view'),
         vTitle = document.getElementById('v-tit'), emptyMsg = document.getElementById('empty-msg'),
         pFill = document.getElementById('p-fill'), pPerc = document.getElementById('p-perc');
 
   let library = [];

   function cleanName(name) { return name.split('/').pop().replace(/\.[^/.]+$/, "").split('?')[0].toUpperCase(); }

   // --- LOGICA DE VIDEO ---
   function updateVol(val) {
       mainVid.volume = val;
       document.getElementById('vol-label').innerText = `> VOL: ${Math.round(val * 100)}%`;
   }

   function updateSpeed(val) {
       mainVid.playbackRate = parseFloat(val);
       document.getElementById('speed-label').innerText = `> RATE: ${parseFloat(val).toFixed(1)}x`;
   }

   function toggleMute() {
       mainVid.muted = !mainVid.muted;
       document.getElementById('mute-btn').innerText = mainVid.muted ? "MUTE: ON" : "MUTE: OFF";
       document.getElementById('mute-btn').style.color = mainVid.muted ? "#ff0055" : "var(--neon)";
   }

   mainVid.ontimeupdate = () => {
       const pct = (mainVid.currentTime / mainVid.duration) * 100 || 0;
       pFill.style.width = `${pct}%`;
       pPerc.innerText = `${Math.round(pct)}%`;
   };

   function seekVideo(e) {
       const rect = e.currentTarget.getBoundingClientRect();
       const pos = (e.clientX - rect.left) / rect.width;
       mainVid.currentTime = pos * mainVid.duration;
   }

   // --- BIBLIOTECA ---
   function saveToStorage() {
       const remoteData = library.filter(v => v.isRemote);
       localStorage.setItem('cobalt_vault_data', JSON.stringify(remoteData));
   }

   function loadFromStorage() {
       const data = localStorage.getItem('cobalt_vault_data');
       if (data) {
           JSON.parse(data).forEach(v => {
               if (!library.some(item => item.url === v.url)) addVideoToLibrary(v);
           });
       }
   }

   function fetchUrl() {
       const url = prompt("Introduce URL del recurso (.mp4, .webm):");
       if (url) {
           const videoData = { id: crypto.randomUUID(), url, name: cleanName(url) || "NET_STREAM", isRemote: true };
           addVideoToLibrary(videoData);
           saveToStorage();
       }
   }

   function addVideoToLibrary(v) {
       if(emptyMsg) emptyMsg.style.display = 'none';
       if(!library.find(i => i.id === v.id)) library.push(v);
     
       const card = document.createElement('div');
       card.className = 'card scanlines';
       card.innerHTML = `<div class="thumb-area"><video src="${v.url}#t=1" muted></video></div><div style="padding:10px; font-size:0.7rem;">> ${v.name}</div>`;
       card.onclick = () => openPlayer(v);
       grid.prepend(card);
   }

   function openPlayer(v) {
       homeView.style.display = 'none';
       playerView.style.display = 'flex';
       mainVid.src = v.url;
       mainVid.load();
       vTitle.innerText = `> EXECUTING: ${v.name}`;
     
       // Reset UI
       mainVid.playbackRate = 1;
       document.getElementById('speed-slider').value = 1;
       document.getElementById('speed-label').innerText = `> RATE: 1.0x`;

       // Render Side List
       sideList.innerHTML = '<div style="font-size:0.7rem; margin-bottom:15px; opacity:0.5;">[ OTROS_ARCHIVOS ]</div>';
       library.forEach(item => {
           if (item.id !== v.id) {
               const mini = document.createElement('div');
               mini.className = 'mini-card';
               mini.innerHTML = `
                   <div style="width:70px; height:40px; background:#000; flex-shrink:0;" class="scanlines">
                       <video src="${item.url}#t=1" muted style="width:100%; height:100%; object-fit:cover;"></video>
                   </div>
                   <div style="overflow:hidden; text-overflow:ellipsis;">${item.name}</div>`;
               mini.onclick = () => openPlayer(item);
               sideList.appendChild(mini);
           }
       });
   }

   function closePlayer() {
       mainVid.pause();
       mainVid.removeAttribute('src');
       mainVid.load();
       playerView.style.display = 'none';
       homeView.style.display = 'block';
   }

   function clearLibrary() { if(confirm("WIPE STORAGE?")) { library = []; localStorage.removeItem('cobalt_vault_data'); location.reload(); } }

   document.getElementById('files').onchange = (e) => {
       Array.from(e.target.files).forEach(file => {
           const url = URL.createObjectURL(file);
           addVideoToLibrary({ id: crypto.randomUUID(), url, name: cleanName(file.name), isRemote: false });
       });
   };

   window.onload = loadFromStorage;