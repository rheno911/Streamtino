// index.js
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const manifest = require("./manifest");
const { streamCache, catalogCache, imdbIdCache } = require("./utils/cache");

// importar scrapers
const cineby = require("./scrapers/cineby");
const sololatino = require("./scrapers/sololatino");
const tioplus = require("./scrapers/tioplus");
const lamovie = require("./scrapers/lamovie");
const cinezo = require("./scrapers/cinezo");
const tubitv = require("./scrapers/tubitv");
const detodopeliculas = require("./scrapers/detodopeliculas");
const pelispedia = require("./scrapers/pelispedia");
const verpeliculasultra = require("./scrapers/verpeliculasyseries");
const latanime = require("./scrapers/latanime");
const estrenosanime = require("./scrapers/estrenosanime");
const entrepeliculasyseries = require("./scrapers/entrepeliculasyseries");
const gnulahd = require("./scrapers/gnulahd");

// grupos de scrapers
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

// parser de id (tt123 | latam:source:id)
function parseId(id) {
  const prefixMatch = id.match(/^latam:(.+?):(.+?)$/);
  if (prefixMatch) {
    return {
      isLatam: true,
      source: prefixMatch[1],
      sourceId: prefixMatch[2],
    };
  }
  const idMatch = id.match(/^(ttd+)(?::(d+):(d+))?$/);
  if (idMatch) {
    const imdbId = idMatch[1];
    const season = idMatch[2] ? parseInt(idMatch[2], 10) : null;
    const episode = idMatch[3] ? parseInt(idMatch[3], 10) : null;
    return { imdbId, season, episode, isLatam: false };
  }
  return { imdbId: null, season: null, episode: null, isLatam: false };
}

const builder = new addonBuilder(manifest);

// ===================== CATALOG =====================

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

  const results = await Promise.allSettled(
    scrapers.map((s) => {
      if (search && s.search) {
        return s.search(search, type);
      }
      return s.getCatalog(type, skip);
    })
  );

  let metas = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      metas = metas.concat(r.value);
    }
  }

  const stremioMetas = metas
    .filter((m) => m && m.name)
    .slice(0, 100)
    .map((m) => ({
      id: m.id || `latam:${m.source || "unknown"}:${encodeURIComponent(m.name)}`,
      type: m.type || type,
      name: m.name,
      poster: m.poster || m.img || "",
      year: m.year ? parseInt(m.year, 10) : undefined,
      description: m.source ? `Fuente: ${m.source}` : undefined,
      links: m.sourceUrl ? [
        { name: "Ver en web", category: "stream", url: m.sourceUrl },
      ] : undefined,
    }));

  const response = { metas: stremioMetas };
  catalogCache.set(cacheKey, response);
  return response;
});

// ===================== STREAM =====================

builder.defineStreamHandler(async ({ type, id }) => {
  const cacheKey = `stream:${type}:${id}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  console.log(`[Stream] type=${type} id=${id}`);

  const parsed = parseId(id);
  if (!parsed.isLatam && !parsed.imdbId) {
    return { streams: [] };
  }

  let scrapers = [];
  if (type === "movie") {
    scrapers = MOVIE_SCRAPERS;
  } else if (type === "series") {
    scrapers = [...SERIES_SCRAPERS, ...ANIME_SCRAPERS];
  } else {
    scrapers = [...MOVIE_SCRAPERS, ...SERIES_SCRAPERS, ...ANIME_SCRAPERS];
  }

  const results = await Promise.allSettled(
    scrapers.map((s) => {
      if (parsed.isLatam && s.getSourceIdStreams) {
        return s.getSourceIdStreams(parsed.sourceId, type, parsed.season, parsed.episode);
      }
      return s.getStreams(parsed.imdbId, type, parsed.season, parsed.episode);
    })
  );

  let streams = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      streams = streams.concat(r.value);
    }
  }

  const seen = new Set();
  streams = streams
    .filter((s) => s && s.url)
    .map((s) => {
      if (!seen.has(s.url)) {
        seen.add(s.url);
        return {
          ...s,
          behaviorHints: {
            notWebReady: false,
            bingeGroup: s.source || s.name || null,
          },
        };
      }
      return null;
    })
    .filter(Boolean);

  console.log(`[Stream] Encontrados ${streams.length} streams para ${id}`);

  const response = { streams };
  streamCache.set(cacheKey, response);
  return response;
});

// ===================== META =====================

builder.defineMetaHandler(async ({ type, id }) => {
  const parsed = parseId(id);

  if (parsed.isLatam) {
    const { source, sourceId } = parsed;
    const sourceUrl = `https://your-real-source.com/${source}/${encodeURIComponent(sourceId)}`;
    return {
      meta: {
        id,
        type,
        name: `Contenido LatAm: ${source}`,
        description: `Proveniente de ${source}`,
        links: [
          { name: "Abrir en web", category: "stream", url: sourceUrl },
        ],
      },
    };
  }

  if (id.startsWith("tt")) {
    return {
      meta: {
        id,
        type,
        name: `Contenido ${id}`,
        description: `Película o serie de IMDb: ${id}`,
      },
    };
  }

  return {
    meta: {
      id,
      type,
      name: id,
      description: `Meta generada por LatAm Streams`,
    },
  };
});

// ===================== SERVIDOR =====================

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
