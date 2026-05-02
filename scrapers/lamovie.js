// scrapers/lamovie.js
const cheerio = require("cheerio");
const { get } = require("../utils/http");
const { extractVideoUrl, extractIframes } = require("../utils/extractor");

const BASE = "https://la.movie";
const SOURCE = "La.Movie";

async function search(query, type) {
  const url = `${BASE}/?s=${encodeURIComponent(query)}`;
  const res = await get(url, { headers: { Referer: BASE } });
  const $ = cheerio.load(res.data);

  const results = [];
  $("article a, .result a, .movie-item a").each((_, el) => {
    const href = $(el).attr("href") || "";
    const title = $(el).text().trim() || $(el).find("img").attr("alt") || "";
    const img = $(el).find("img").attr("src") || "";
    if (title && href) {
      results.push({
        id: `latam:lamovie:${encodeURIComponent(href)}`,
        name: title,
        type,
        poster: img,
        source: SOURCE,
        sourceUrl: href,
      });
    }
  });

  return results;
}

async function getStreams(imdbId, type, season, episode) {
  const url = `${BASE}/?s=${encodeURIComponent(imdbId)}`;
  const res = await get(url, { headers: { Referer: BASE } });
  const $ = cheerio.load(res.data);

  const link = $("article a, h2 a").first().attr("href");
  if (!link) return [];

  let targetUrl = link.startsWith("http") ? link : BASE + link;

  if (type === "series" && season && episode) {
    const p = await get(targetUrl, { headers: { Referer: BASE } });
    const p$ = cheerio.load(p.data);
    const ep = p$(`a[href*="${season}x${String(episode).padStart(2, "0")}"]`).attr("href");
    if (ep) targetUrl = ep.startsWith("http") ? ep : BASE + ep;
  }

  const iframes = await extractIframes(targetUrl, BASE);
  const streams = [];

  for (const iframe of iframes.slice(0, 4)) {
    const videoUrl = await extractVideoUrl(iframe, targetUrl);
    if (videoUrl) streams.push({
      name: SOURCE,
      title: `🎬 ${SOURCE}`,
      url: videoUrl,
      source: SOURCE,
    });
  }

  return streams;
}

async function getCatalog(type, skip = 0) {
  const page = Math.floor(skip / 20) + 1;
  const res = await get(`${BASE}/page/${page}/`, { headers: { Referer: BASE } });
  const $ = cheerio.load(res.data);

  const items = [];
  $("article, .movie-item").each((_, el) => {
    const title = $(el).find("h2, h3").first().text().trim();
    const link = $(el).find("a").first().attr("href") || "";
    const img = $(el).find("img").attr("src") || "";
    if (title && link) {
      items.push({
        id: `latam:lamovie:${encodeURIComponent(link)}`,
        type,
        name: title,
        poster: img,
        source: SOURCE,
        sourceUrl: link,
      });
    }
  });

  return items;
}

// opcional para future getSourceIdStreams
async function getSourceIdStreams(sourceId, type, season, episode) {
  const targetUrl = `${BASE}?s=${encodeURIComponent(sourceId)}`;
  return await getStreams(sourceId, type, season, episode);
}

module.exports = { search, getStreams, getCatalog, getSourceIdStreams, SOURCE, BASE };
