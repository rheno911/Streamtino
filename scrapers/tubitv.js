// ============================================================
//  scrapers/tubitv.js - Scraper para tubitv.com (API pública)
// ============================================================
const { get } = require("../utils/http");

const BASE = "https://tubitv.com";
const API = "https://tubitv.com/oz/videos";
const SOURCE = "TubiTV";

// TubiTV tiene una API relativamente abierta
async function search(query, type) {
  try {
    const url = `https://tubitv.com/search/${encodeURIComponent(query)}`;
    const apiUrl = `https://tubitv.com/oz/videos/search?q=${encodeURIComponent(query)}&limit=20`;
    const res = await get(apiUrl, { headers: { Referer: BASE } });
    const data = res.data;

    if (!data || !data.data) return [];

    return data.data.map((item) => ({
      title: item.title,
      link: `${BASE}/video/${item.id}`,
      img: item.thumbnails?.[0]?.replace("{width}", "300") || "",
      year: item.year,
    }));
  } catch (err) {
    console.error(`[${SOURCE}] Error buscando:`, err.message);
    return [];
  }
}

async function getStreams(imdbId, type, season, episode) {
  try {
    // Buscar en TubiTV por IMDB ID
    const searchUrl = `https://tubitv.com/oz/videos/content?search=${imdbId}&limit=5`;
    const res = await get(searchUrl, { headers: { Referer: BASE } });
    const items = res.data?.data || [];

    if (!items.length) return [];

    const item = items[0];
    let videoId = item.id;

    // Si es serie, busca el episodio específico
    if (type === "series" && season && episode) {
      const seasons = item.seasons || [];
      const targetSeason = seasons.find((s) => s.id === season || s.number == season);
      if (targetSeason) {
        const ep = (targetSeason.episodes || []).find((e) => e.number == episode);
        if (ep) videoId = ep.id;
      }
    }

    // Obtiene las URLs de video (TubiTV sirve m3u8)
    const videoUrl = `https://tubitv.com/oz/videos/${videoId}/content?video_resources=dash,hlsv3,hlsv4`;
    const videoRes = await get(videoUrl, { headers: { Referer: BASE } });
    const videoData = videoRes.data;

    const streams = [];
    const resources = videoData?.video_resources || [];
    for (const r of resources) {
      if (r.manifest?.url) {
        streams.push({
          name: SOURCE,
          title: `📺 ${SOURCE} - ${r.type || "HLS"}`,
          url: r.manifest.url,
        });
      }
    }

    return streams;
  } catch (err) {
    console.error(`[${SOURCE}] Error streams:`, err.message);
    return [];
  }
}

async function getCatalog(type, skip = 0) {
  try {
    const contentType = type === "movie" ? "movies" : "series";
    const url = `https://tubitv.com/oz/videos/sponsored_listing?content_type=${contentType}&offset=${skip}&limit=20&locale=es-MX`;
    const res = await get(url, { headers: { Referer: BASE } });
    const items = res.data?.data || [];

    return items.map((item) => ({
      id: `latam:tubitv:${item.id}`,
      type,
      name: item.title,
      poster: (item.thumbnails?.[0] || "").replace("{width}", "300"),
      year: item.year,
      source: SOURCE,
      sourceUrl: `${BASE}/video/${item.id}`,
    }));
  } catch (err) {
    console.error(`[${SOURCE}] Error catálogo:`, err.message);
    return [];
  }
}

module.exports = { search, getStreams, getCatalog, SOURCE, BASE };
