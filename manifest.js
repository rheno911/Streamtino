const manifest = {
  id: "community.streamtino",
  version: "1.0.0",
  name: "Streamtino",
  description: "Streamtino - Streams en Español Latino para Nuvio y Arvio",
  logo: "https://imgur.com/a/lxcjyku",
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "latam-movies",
      name: "Streamtino Películas",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-series",
      name: "Streamtino Series",
      extra: [{ name: "search" }, { name: "skip" }],
    },
    {
      type: "series",
      id: "latam-anime-series",
      name: "Streamtino Anime",
      extra: [{ name: "search" }, { name: "skip" }],
    },
  ],
  resources: ["catalog", "stream", "meta"],
  idPrefixes: ["tt", "latam:"],
  behaviorHints: { adult: false, p2p: false },
};

module.exports = manifest;
