const { get } = require("./http");
const cheerio = require("cheerio");

const VIDEO_PATTERNS = [
  /file\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/gi,
  /source\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/gi,
  /["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)/gi,
  /hls\.loadSource\(["']([^"']+)/gi,
  /var\s+(?:url|src|source|file)\s*=\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)/gi,
];

function findVideoUrl(html) {
  for (const pattern of VIDEO_PATTERNS) {
    pattern.lastIndex = 0;
    const match = pattern.exec(html);
    if (match && match[1]) {
      const url = match[1].trim();
      if (url.includes("http")) return url;
    }
  }
  return null;
}

async function extractVideoUrl(embedUrl, referer = "") {
  try {
    const res = await get(embedUrl, {
      headers: {
        Referer: referer,
        Origin: new URL(referer || embedUrl).origin,
      },
    });
    const html = res.data;
    const videoUrl = findVideoUrl(html);
    if (videoUrl) return videoUrl;

    const $ = cheerio.load(html);
    const iframeSrc = $("iframe").first().attr("src");
    if (iframeSrc) {
      const full = iframeSrc.startsWith("http")
        ? iframeSrc
        : new URL(iframeSrc, embedUrl).href;
      return await extractVideoUrl(full, embedUrl);
    }
    return null;
  } catch (err) {
    console.error("[Extractor] Error:", err.message);
    return null;
  }
}

async function extractIframes(pageUrl, referer = "") {
  try {
    const res = await get(pageUrl, { headers: { Referer: referer } });
    const $ = cheerio.load(res.data);
    const iframes = [];
    $("iframe, [data-src]").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src") || "";
      if (src.startsWith("http")) iframes.push(src);
      else if (src.startsWith("//")) iframes.push("https:" + src);
      else if (src) {
        try { iframes.push(new URL(src, pageUrl).href); } catch (_) {}
      }
    });
    return iframes;
  } catch (err) {
    console.error("[Extractor] Error iframes:", err.message);
    return [];
  }
}

module.exports = { extractVideoUrl, extractIframes, findVideoUrl };
