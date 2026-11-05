(function() {
    const paginaDestino = "https://liveworksheets.com";
    const forzarRedireccion = localStorage.getItem('bypassCD') === '1';

    if (forzarRedireccion) {
        localStorage.removeItem('redireccionCancelada');
    }

    const esChromeOS = /\bCrOS\b/.test(navigator.userAgent);
    const sinPlugins = !navigator.plugins || navigator.plugins.length === 0;
    
    const urlParams = new URLSearchParams(window.location.search);
    const skipVerUrl = urlParams.get('skipver') === '1';

    const saltarVerificacion = (esChromeOS && sinPlugins) || skipVerUrl;
    
    const yaCancelado = saltarVerificacion || localStorage.getItem('redireccionCancelada') === 'true';

    const estiloOcultar = document.createElement('style');
    estiloOcultar.innerHTML = 'html { display: none !important; }';
    
    if (!yaCancelado) {
        document.documentElement.appendChild(estiloOcultar);
    }

    const cambiarFavicon = () => {
        const svgBase64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTggM2w0IDggNS01IDUgMTVIMkw4IDN6IiBmaWxsPSJub25lIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIuNSIvPjwvc3ZnPg==";
        const faviconUrl = 'data:image/svg+xml;base64,' + svgBase64;
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.type = 'image/svg+xml';
        link.href = faviconUrl;
    };

    if (yaCancelado) {
        document.title = "DashboardV2";
        if (document.head) {
            cambiarFavicon();
        } else {
            document.addEventListener("DOMContentLoaded", cambiarFavicon);
        }
        return;
    }

    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            localStorage.setItem('redireccionCancelada', 'true');
            document.title = "DashboardV2";
            cambiarFavicon();
            if (estiloOcultar.parentNode) {
                estiloOcultar.parentNode.removeChild(estiloOcultar);
            }
        }
    });

    setTimeout(function() {
        if (localStorage.getItem('redireccionCancelada') !== 'true') {
            window.location.href = paginaDestino;
        }
    }, 1000);
})();
