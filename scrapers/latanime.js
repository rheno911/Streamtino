// ============================================================
//  scrapers/latanime.js - Scraper para latanime.org
// ============================================================
const cheerio = require("cheerio");
const { get } = require("../utils/http");
const { extractVideoUrl, extractIframes } = require("../utils/extractor");

const BASE = "https://latanime.org";
const SOURCE = "LatAnime";

async function search(query) {
  try {
    const res = await get(`${BASE}/?s=${encodeURIComponent(query)}`, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const results = [];
    $("article, .anime-item, .item").each((_, el) => {
      const title = $(el).find("h2, h3, .title, .anime-name").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";
      const img = $(el).find("img").attr("src") || "";
      if (title && link) results.push({ title, link, img });
    });
    return results;
  } catch (err) {
    console.error(`[${SOURCE}]:`, err.message);
    return [];
  }
}

async function getStreams(imdbId, type, season, episode) {
  try {
    const res = await get(`${BASE}/?s=${imdbId}`, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const link = $("article a, h2 a, .anime-item a").first().attr("href");
    if (!link) return [];
    let targetUrl = link.startsWith("http") ? link : BASE + link;

    if (episode) {
      const p = await get(targetUrl, { headers: { Referer: BASE } });
      const p$ = cheerio.load(p.data);
      const epLink = p$(
        `.episodios a:nth-child(${episode}),
         a[href*="episodio-${episode}"],
         a[href*="episode-${episode}"]`
      ).first().attr("href");
      if (epLink) targetUrl = epLink.startsWith("http") ? epLink : BASE + epLink;
    }

    const iframes = await extractIframes(targetUrl, BASE);
    const streams = [];
    for (const iframe of iframes.slice(0, 5)) {
      const videoUrl = await extractVideoUrl(iframe, targetUrl);
      if (videoUrl) {
        streams.push({ name: SOURCE, title: `🌸 ${SOURCE} - Latino`, url: videoUrl });
      }
    }
    return streams;
  } catch (err) {
    console.error(`[${SOURCE}]:`, err.message);
    return [];
  }
}

async function getCatalog(type, skip = 0) {
  try {
    const page = Math.floor(skip / 20) + 1;
    const res = await get(`${BASE}/animes/page/${page}/`, { headers: { Referer: BASE } });
    const $ = cheerio.load(res.data);
    const items = [];
    $("article, .anime-item").each((_, el) => {
      const title = $(el).find("h2, h3, .title, .anime-name").first().text().trim();
      const link = $(el).find("a").first().attr("href") || "";
      const img = $(el).find("img").attr("src") || $(el).find("img").attr("data-src") || "";
      if (title && link) {
        items.push({
          id: `latam:latanime:${encodeURIComponent(link)}`,
          type: "series",
          name: title,
          poster: img,
          source: SOURCE,
          sourceUrl: link,
        });
      }
    });
    return items;
  } catch (err) {
    return [];
  }
}

module.exports = { search, getStreams, getCatalog, SOURCE, BASE };
