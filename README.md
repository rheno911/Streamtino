# 🎬 Stremio LatAm Addon

Addon de Stremio con contenido en **Español Latino** compatible con **Nuvio** y **Arvio**.

## 📡 Fuentes incluidas

| Sitio | Tipo | Categoría |
|-------|------|-----------|
| cineby.sc | Películas + Series | General |
| sololatino.net | Películas + Series | Latino |
| tioplus.app | Películas + Series | General |
| la.movie | Películas + Series | General |
| cinezo.net | Películas + Series | General |
| tubitv.com | Películas + Series | GRATIS Legal |
| detodopeliculas.nu | Películas + Series | General |
| pelispedia.is | Películas + Series | General |
| verpeliculasultra.com | Películas + Series | General |
| latanime.org | Anime | Anime Latino |
| estrenosanime.net | Anime | Anime Latino |
| entrepelicilasyseries.nz | Películas + Series | General |
| ww3.gnulahd.nu | Películas + Series | HD |

---

## 🚀 Instalación (Método 1: Local)

### Requisitos
- Node.js v16 o superior
- npm

### Pasos

```bash
# 1. Entra a la carpeta del addon
cd stremio-latam-addon

# 2. Instala las dependencias
npm install

# 3. Inicia el servidor
npm start
```

El addon estará disponible en:
```
http://localhost:7000/manifest.json
```

### Agregar a Stremio
1. Abre Stremio
2. Ve a **Addons** → **Community**
3. Pega la URL: `http://localhost:7000/manifest.json`
4. Haz clic en **Instalar**

### Agregar a Nuvio / Arvio
1. Abre Nuvio o Arvio
2. Ve a **Configuración** → **Addons**
3. Selecciona **Agregar addon personalizado**
4. Ingresa: `http://TU_IP_LOCAL:7000/manifest.json`

---

## 🌐 Instalación (Método 2: Servidor / Hugging Face / Railway)

### Deploy en Railway (recomendado)

1. Crea una cuenta en [railway.app](https://railway.app)
2. Sube el código a GitHub
3. En Railway: **New Project** → **Deploy from GitHub**
4. Railway detectará Node.js automáticamente
5. Copia la URL pública y agrégala a Stremio/Nuvio/Arvio

### Variables de entorno

```env
PORT=7000
```

---

## 🛠️ Configuración avanzada

### Cambiar puerto
```bash
PORT=8080 npm start
```

### Agregar más fuentes

Crea un nuevo scraper en `scrapers/mi-sitio.js` siguiendo la estructura:

```javascript
const BASE = "https://mi-sitio.com";
const SOURCE = "MiSitio";

async function search(query, type) { /* ... */ }
async function getStreams(imdbId, type, season, episode) { /* ... */ }
async function getCatalog(type, skip) { /* ... */ }

module.exports = { search, getStreams, getCatalog, SOURCE, BASE };
```

Luego agrégalo en `index.js`:
```javascript
const miSitio = require("./scrapers/mi-sitio");
// Agregar a MOVIE_SCRAPERS o SERIES_SCRAPERS
```

---

## 🔧 Solución de problemas

### El addon no encuentra streams
- Algunos sitios bloquean IPs de servidores. Intenta correr el addon **localmente**.
- Verifica que el sitio sigue activo desde tu navegador.
- Los selectores CSS pueden cambiar si el sitio actualiza su diseño.

### Error de CORS
- El addon ya incluye cabeceras CORS. Si usas un proxy, asegúrate de que no las elimine.

### Streams lentos
- La caché reduce las búsquedas repetidas (10 min para streams, 30 min para catálogos).
- Ajusta el TTL en `utils/cache.js` si necesitas datos más frescos.

---

## 📋 Estructura del proyecto

```
stremio-latam-addon/
├── index.js                    # Servidor principal
├── manifest.js                 # Configuración del addon
├── package.json
├── scrapers/
│   ├── cineby.js
│   ├── sololatino.js
│   ├── tioplus.js
│   ├── lamovie.js
│   ├── cinezo.js
│   ├── tubitv.js
│   ├── detodopeliculas.js
│   ├── pelispedia.js
│   ├── verpeliculasultra.js
│   ├── latanime.js
│   ├── estrenosanime.js
│   ├── entrepeliculasyseries.js
│   └── gnulahd.js
└── utils/
    ├── http.js                 # Cliente HTTP con reintentos
    ├── extractor.js            # Extractor de URLs de video
    └── cache.js                # Caché en memoria
```

---

## ⚠️ Aviso legal

Este addon es solo una herramienta técnica que agrega acceso a contenido público disponible en internet. El usuario es responsable del uso que haga del mismo y de cumplir con las leyes de su país.

---

## 💡 Tips para Nuvio/Arvio

- En **Nuvio**: ve a Ajustes → Complementos → Agregar por URL
- En **Arvio**: ve a Settings → Add-ons → Add custom add-on
- Si estás en la misma red local, usa la IP de tu computadora (ej: `192.168.1.x:7000`)
- Para acceso remoto, usa Railway, Render o Glitch para hacer deploy gratuito
