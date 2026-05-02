const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const manifest = require("./manifest");
const { streamCache, catalogCache } = require("./utils/cache");

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

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const skip = parseInt(extra?.skip || "0", 10);
  const search = extra?.search || "";
  const cacheKey = `catalog:${type}:${id}:${skip}:${search}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  let scrapers = [];
  if (id === "latam-anime-series") scrapers = ANIME_SCRAPERS;
  else if (type === "movie") scrapers = MOVIE_SCRAPERS;
  else scrapers = SERIES_SCRAPERS;

  const results = await Promise.allSettled(
    scrapers.map((s) => search && s.search ? s.search(search, type) : s.getCatalog(type, skip))
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
      id: m.id || `latam:${encodeURIComponent(m.name)}`,
      type: m.type || type,
      name: m.name,
      poster: m.poster || m.img || "",
      year: m.year ? parseInt(m.year) : undefined,
    }));

  const response = { metas: stremioMetas };
  catalogCache.set(cacheKey, response);
  return response;
});

builder.defineStreamHandler(async ({ type, id }) => {
  const cacheKey = `stream:${type}:${id}`;
  const cached = streamCache.get(cacheKey);
  if (cached) return cached;

  let imdbId = id;
  let season = null;
  let episode = null;

  if (id.includes(":")) {
    const parts = id.split(":");
    imdbId = parts[0];
    season = parseInt(parts[1]) || null;
    episode = parseInt(parts[2]) || null;
  }

  let scrapers = [];
  if (type === "movie") scrapers = MOVIE_SCRAPERS;
  else scrapers = [...SERIES_SCRAPERS, ...ANIME_SCRAPERS];

  const results = await Promise.allSettled(
    scrapers.map((s) => s.getStreams(imdbId, type, season, episode))
  );

  let streams = [];
  for (const r of results) {
    if (r.status === "fulfilled" && Array.isArray(r.value)) {
      streams = streams.concat(r.value);
    }
  }

  const seen = new Set();
  streams = streams.filter((s) => {
    if (!s || !s.url || seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  const response = { streams };
  streamCache.set(cacheKey, response);
  return response;
});

builder.defineMetaHandler(async ({ type, id }) => {
  return { meta: { id, type, name: id } };
});

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`Addon corriendo en puerto ${PORT}`);
