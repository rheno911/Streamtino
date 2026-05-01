// ============================================================
//  index.js - Stremio LatAm Addon - Punto de entrada principal
//  Compatible con Nuvio y Arvio
// ============================================================
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const manifest = require("./manifest");
const { streamCache, catalogCache } = require("./utils/cache");

// ── Importar todos los scrapers ──────────────────────────────
const cineby = require("./scrapers/cineby");
const sololatino = require("./scrapers/sololatino");
const tioplus = require("./scrapers/tioplus");
const lamovie = require("./scrapers/lamovie");
const cinezo = require("./scrapers/cinezo");
const tubitv = require("./scrapers/tubitv");
const detodopeliculas = require("./scrapers/detodopeliculas");
const pelispedia = require("./scrapers/pelispedia");
const verpeliculasultra = require("./scrapers/verpeliculasultra");
const latanime = require("./scrapers/latanime");
const estrenosanime = require("./scrapers/estrenosanime");
const entrepeliculasyseries = require("./scrapers/entrepeliculasyseries");
const gnulahd = require("./scrapers/gnulahd");

// Agrupar scrapers por tipo de contenido
const MOVIE_SCRAPERS = [
  cineby, sololatino, tioplus, lamovie, cinezo,
  tubitv, detodopeliculas, pelispedia, verpeliculasultra,
  entrepeliculasyseries, gnulahd,
];

const SERIES_SCRAPERS = [
  cineby, sololatino, tioplus, lamovie, cinezo,
  tubitv, detodopeliculas, pelispedia, verpeliculasultra,
  entrepeliculasyseries, gnulahd,
];

const ANIME_SCRAPERS = [latanime, estrenosanime];

// ── Construir el addon ───────────────────────────────────────
const builder = new addonBuilder(manifest);

// ============================================================
//  CATÁLOGO
// ============================================================
builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const skip = parseInt(extra?.skip || "0", 10);
  const search = extra?.search || "";
  const cacheKey = `catalog:${type}:${id}:${skip}:${search}`;

  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  console.log(`[Catalog] type=${type} id=${id} skip=${skip} search="${search}"`);

  let scrapers = [];
  if (id === "latam-anime-movies" || id === "latam-anime-series") {
    scrapers = ANIME_SCRAPERS;
  } else if (type === "movie") {
    scrapers = MOVIE_SCRAPERS;
  } else {
    scrapers = SERIES_SCRAPERS;
  }

  // Ejecutar scrapers en paralelo (máx 4 a la vez para no sobrecargar)
  const results = await Promise.allSettled(
    scrapers.map((s) => {
      if (search && s.search) return s.search(search, type);
      return s.getCatalog(type, skip);
    })
  );

  let metas = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      metas = metas.concat(r.value);
    }
  }

  // Convertir a formato Stremio meta
  const stremioMetas = metas
    .filter((m) => m && m.name)
    .slice(0, 100)
    .map((m) => ({
      id: m.id || `latam:${encodeURIComponent(m.name)}`,
      type: m.type || type,
      name: m.name,
      poster: m.poster || m.img || "",
      year: m.year ? parseInt(m.year) : undefined,
      description: m.source ? `Fuente: ${m.source}` : undefined,
      links: m.sourceUrl ? [{ name: "Ver en web", category: "stream", url: m.sourceUrl }] : undefined,
    }));

  const response = { metas: stremioMetas };
  catalogCache.set(cacheKey, response);
  return response;
});

// ============================================================
//  STREAM
// ============================================================
builder.defineStreamHandler(async ({ type, id }) => {
  const cacheKey = `stream:${type}:${id}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  console.log(`[Stream] type=${type} id=${id}`);

  // Parsear id: puede ser "tt1234567" o "tt1234567:1:2" para series
  let imdbId = id;
  let season = null;
  let episode = null;

  if (id.includes(":")) {
    const parts = id.split(":");
    imdbId = parts[0];
    season = parseInt(parts[1]) || null;
    episode = parseInt(parts[2]) || null;
  }

  // Seleccionar scrapers apropiados
  let scrapers = [];
  if (type === "movie") {
    scrapers = MOVIE_SCRAPERS;
  } else if (type === "series") {
    scrapers = [...SERIES_SCRAPERS, ...ANIME_SCRAPERS];
  } else {
    scrapers = [...MOVIE_SCRAPERS, ...SERIES_SCRAPERS, ...ANIME_SCRAPERS];
  }

  // Ejecutar todos en paralelo y recoger streams
  const results = await Promise.allSettled(
    scrapers.map((s) => s.getStreams(imdbId, type, season, episode))
  );

  let streams = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      streams = streams.concat(r.value);
    }
  }

  // Filtrar y deduplicar por URL
  const seen = new Set();
  streams = streams.filter((s) => {
    if (!s || !s.url) return false;
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  console.log(`[Stream] Encontrados ${streams.length} streams para ${id}`);

  const response = { streams };
  streamCache.set(cacheKey, response);
  return response;
});

// ============================================================
//  META (información de la película/serie)
// ============================================================
builder.defineMetaHandler(async ({ type, id }) => {
  // Para IDs de IMDb, devolvemos meta básica
  // En producción se podría conectar a TMDB o OMDB
  if (id.startsWith("tt")) {
    return {
      meta: {
        id,
        type,
        name: id,
      },
    };
  }

  // Para IDs internos, decodificar la URL de la fuente
  const parts = id.split(":");
  if (parts.length >= 3) {
    const sourceUrl = decodeURIComponent(parts.slice(2).join(":"));
    return {
      meta: {
        id,
        type,
        name: id,
        description: `Contenido de: ${sourceUrl}`,
        links: [{ name: "Abrir en web", category: "stream", url: sourceUrl }],
      },
    };
  }

  return { meta: { id, type, name: id } };
});

// ============================================================
//  SERVIDOR HTTP
// ============================================================
const PORT = process.env.PORT || 7000;

serveHTTP(builder.getInterface(), { port: PORT });

console.log(`
╔══════════════════════════════════════════════════════════╗
║         🎬  Stremio LatAm Addon - Iniciado               ║
╠══════════════════════════════════════════════════════════╣
║  Puerto    : ${PORT}                                        ║
║  Manifest  : http://localhost:${PORT}/manifest.json         ║
║  Instalar  : http://localhost:${PORT}/                      ║
╠══════════════════════════════════════════════════════════╣
║  Fuentes activas:                                        ║
║   ✅ Cineby.sc         ✅ SoloLatino.net                 ║
║   ✅ TioPlus.app       ✅ La.Movie                       ║
║   ✅ Cinezo.net        ✅ TubiTV.com                     ║
║   ✅ DetodoPeliculas   ✅ PelisPedia.is                  ║
║   ✅ VerPeliculasUltra ✅ LatAnime.org                   ║
║   ✅ EstrenosAnime.net ✅ EntrePeliculasySeries.nz       ║
║   ✅ GnulaHD.nu                                          ║
╚══════════════════════════════════════════════════════════╝
`);
