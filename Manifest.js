// manifest.js
const manifest = {
  id: "community.stremio-latam-addon",
  version: "1.0.0",
  name: "LatAm Streams",
  description: "Streams en Español Latino - Cineby, SoloLatino, TioPlus, GnulaHD y más.",
  logo: "https://i.imgur.com/LCKlwkZ.png",
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "latam-movies",
      name: "Películas LatAm",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-series",
      name: "Series LatAm",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-anime-series",
      name: "Anime LatAm",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "movie",
      id: "latam-anime-movies",
      name: "Películas de Anime",
      extra: [{ name: "search" }, { name: "skip" }],
    },
  ],
  resources: ["catalog", "stream", "meta"],
  idPrefixes: ["tt", "latam:"],
  behaviorHints: { adult: false, p2p: false },
};

module.exports = manifest;
