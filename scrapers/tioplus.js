// ============================================================
//  scrapers/tioplus.js - Scraper para tioplus.app
// ============================================================
const cheerio = require("cheerio");
const { get } = require("../utils/http");
const { extractVideoUrl, extractIframes } = require("../utils/extractor");

const BASE = "https://tioplus.app";
const SOURCE = "TioPlus";

async function search(query, type) {
  try {
    const url = `${BASE}/?s=${encodeURIComponent(query)}`;
    const res = await get(url, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const results = [];

    $("article, .post, .item-movie").each((_, el) => {
      const title = $(el).find("h2, h3, .entry-title, .title").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";
      const img = $(el).find("img").attr("src") || "";
      if (title && link) results.push({ title, link, img });
    });

    return results;
  } catch (err) {
    console.error(`[${SOURCE}] Error:`, err.message);
    return [];
  }
}

async function getStreams(imdbId, type, season, episode) {
  try {
    const res = await get(`${BASE}/?s=${imdbId}`, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const firstLink = $("article a, h2 a").first().attr("href");
    if (!firstLink) return [];

    let targetUrl = firstLink.startsWith("http") ? firstLink : BASE + firstLink;

    if (type === "series" && season && episode) {
      const pageRes = await get(targetUrl, { headers: { Referer: BASE } });
      const p$ = cheerio.load(pageRes.data);
      const epLink = p$(
        `a[href*="temporada-${season}"], a[href*="episodio-${episode}"]`
      ).first().attr("href");
      if (epLink) targetUrl = epLink.startsWith("http") ? epLink : BASE + epLink;
    }

    const iframes = await extractIframes(targetUrl, BASE);
    const streams = [];
    for (const iframe of iframes.slice(0, 5)) {
      const videoUrl = await extractVideoUrl(iframe, targetUrl);
      if (videoUrl) {
        streams.push({
          name: SOURCE,
          title: `📡 ${SOURCE}\n${new URL(iframe).hostname}`,
          url: videoUrl,
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
    const page = Math.floor(skip / 20) + 1;
    const url = `${BASE}/page/${page}/`;
    const res = await get(url, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const items = [];

    $("article, .item-movie").each((_, el) => {
      const title = $(el).find("h2, h3, .title").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";
      const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
      const isMovie = link.includes("pelicula") || link.includes("movie");
      const isSeries = link.includes("serie") || link.includes("series");
      if (
        title &&
        link &&
        ((type === "movie" && (isMovie || !isSeries)) ||
          (type === "series" && isSeries))
      ) {
        items.push({
          id: `latam:tioplus:${encodeURIComponent(link)}`,
          type,
          name: title,
          poster: img,
          source: SOURCE,
          sourceUrl: link,
        });
      }
    });

    return items;
  } catch (err) {
    console.error(`[${SOURCE}] Error catálogo:`, err.message);
    return [];
  }
}

module.exports = { search, getStreams, getCatalog, SOURCE, BASE };
