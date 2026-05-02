const axios = require("axios");

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "es-MX,es;q=0.9,en-US;q=0.8",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  Connection: "keep-alive",
};

async function get(url, opts = {}, retries = 3) {
  const config = {
    method: "GET",
    url,
    headers: { ...DEFAULT_HEADERS, ...(opts.headers || {}) },
    timeout: opts.timeout || 12000,
    maxRedirects: 5,
    ...opts,
  };
  for (let i = 1; i <= retries; i++) {
    try {
      return await axios(config);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

async function post(url, data = {}, opts = {}, retries = 3) {
  const config = {
    method: "POST",
    url,
    data,
    headers: {
      ...DEFAULT_HEADERS,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(opts.headers || {}),
    },
    timeout: 12000,
    ...opts,
  };
  for (let i = 1; i <= retries; i++) {
    try {
      return await axios(config);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * i));
    }
  }
}

module.exports = { get, post, DEFAULT_HEADERS };
