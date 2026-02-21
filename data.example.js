/* ═══════════════════════════════════════════════════════════════
   data.js — The Pass | Пример структуры данных с новыми полями
   ═══════════════════════════════════════════════════════════════

   НОВЫЕ ПОЛЯ:

   steamRating: {
     label: "Очень положительные",   // текст как в Steam
     score: 92,                       // число 0-100 (для цвета)
     count: 24616                     // кол-во обзоров (рус.)
   }

   isNew: true     — показывает бейдж ✨ Новинка
   source: "local" | "steam" | "marme1adker"

   ═══════════════════════════════════════════════════════════════ */

const GAMES = [
  {
    id: 1,
    name: "Cyberpunk 2077",
    studio: "CD Projekt RED",
    genre: "RPG",
    year: 2020,
    source: "local",
    tags: ["open world", "sci-fi", "story"],
    hasDlc: true,
    hasRu: true,
    online: false,
    isNew: false,
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/1091500/header.jpg",
    appid: 1091500,
    steamUrl: "https://store.steampowered.com/app/1091500",
    steamRating: {
      label: "Очень положительные",
      score: 86,
      count: 540000
    }
  },
  {
    id: 2,
    name: "Hollow Knight",
    studio: "Team Cherry",
    genre: "Платформер",
    year: 2017,
    source: "local",
    tags: ["metroidvania", "инди", "сложно"],
    hasDlc: false,
    hasRu: true,
    online: false,
    isNew: false,
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/367520/header.jpg",
    appid: 367520,
    steamUrl: "https://store.steampowered.com/app/367520",
    steamRating: {
      label: "Крайне положительные",
      score: 97,
      count: 132000
    }
  },
  {
    id: 3,
    name: "Baldur's Gate 3",
    studio: "Larian Studios",
    genre: "RPG",
    year: 2023,
    source: "steam",
    tags: ["D&D", "кооп", "story"],
    hasDlc: false,
    hasRu: true,
    online: true,
    isNew: false,
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/1086940/header.jpg",
    appid: 1086940,
    steamUrl: "https://store.steampowered.com/app/1086940",
    steamRating: {
      label: "Крайне положительные",
      score: 96,
      count: 365000
    }
  },
  {
    id: 4,
    name: "Manor Lords",
    studio: "Slavic Magic",
    genre: "Стратегия",
    year: 2024,
    source: "local",
    tags: ["city builder", "средневековье", "инди"],
    hasDlc: false,
    hasRu: true,
    online: false,
    isNew: true,    // <-- НОВИНКА
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/1363080/header.jpg",
    appid: 1363080,
    steamUrl: "https://store.steampowered.com/app/1363080",
    steamRating: {
      label: "Очень положительные",
      score: 81,
      count: 55000
    }
  },
  {
    id: 5,
    name: "Palworld",
    studio: "Pocketpair",
    genre: "Выживание",
    year: 2024,
    source: "steam",
    tags: ["выживание", "кооп", "крафт"],
    hasDlc: false,
    hasRu: false,
    online: true,
    isNew: true,    // <-- НОВИНКА
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/1623730/header.jpg",
    appid: 1623730,
    steamUrl: "https://store.steampowered.com/app/1623730",
    steamRating: {
      label: "В основном положительные",
      score: 76,
      count: 450000
    }
  },
  {
    id: 6,
    name: "Disco Elysium",
    studio: "ZA/UM",
    genre: "RPG",
    year: 2019,
    source: "local",
    tags: ["narrative", "детектив", "атмосфера"],
    hasDlc: false,
    hasRu: true,
    online: false,
    isNew: false,
    img: "https://cdn.cloudflare.steamstatic.com/steam/apps/632470/header.jpg",
    appid: 632470,
    steamUrl: "https://store.steampowered.com/app/632470",
    steamRating: {
      label: "Крайне положительные",
      score: 97,
      count: 85000
    }
    // steamRating можно не указывать — блок просто не покажется
  },
];
