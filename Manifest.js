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
      name: "LatAm Películas",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-series",
      name: "LatAm Series",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-anime-series",
      name: "LatAm Anime",
      extra: [{ name: "search" }, { name: "skip" }],
    },
  ],
  resources: ["catalog", "stream", "meta"],
  idPrefixes: ["tt", "latam:"],
  behaviorHints: { adult: false, p2p: false },
};

module.exports = manifest;
