/**
 * data.js — источник данных каталога
 *
 * source: 'local' | 'steam' | 'both'
 *   local = мгновенно из локальной базы (без steampass)
 *   steam = только через steampass.gg
 *   both  = есть в обоих источниках
 */

const steamImg = id =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;

async function fetchGames() {
  return [

    // ── Rockstar ─────────────────────────────────────────────────
    { title: 'Grand Theft Auto V',               short: 'GTA V',            group: 'Rockstar',          img: steamImg(271590),  hasDlc: true,  tags: ['Открытый мир', 'Шутер', 'Экшн'],            opts: ['dlc', 'online'], source: 'local' },
    { title: 'Red Dead Redemption 2',            short: 'RDR2',             group: 'Rockstar',          img: steamImg(1174180), hasDlc: true,  tags: ['Открытый мир', 'Сюжет', 'Вестерн'],         opts: ['dlc'],           source: 'local' },
    { title: 'Red Dead Redemption',              short: 'RDR',              group: 'Rockstar',          img: steamImg(2668510),               tags: ['Открытый мир', 'Вестерн', 'Сюжет'],         opts: [],                source: 'steam' },
    { title: 'Grand Theft Auto: San Andreas',    short: 'GTA SA',           group: 'Rockstar',          img: steamImg(12120),                 tags: ['Открытый мир', 'Экшн'],                     opts: [],                source: 'steam' },
    { title: 'Grand Theft Auto: Vice City',      short: 'GTA Vice City',    group: 'Rockstar',          img: steamImg(12110),                 tags: ['Открытый мир', 'Экшн'],                     opts: [],                source: 'steam' },
    { title: 'Grand Theft Auto III',             short: 'GTA III',          group: 'Rockstar',          img: steamImg(12100),                 tags: ['Открытый мир', 'Экшн'],                     opts: [],                source: 'steam' },

    // ── CD Projekt Red ───────────────────────────────────────────
    { title: 'Cyberpunk 2077',                   short: 'Cyberpunk',        group: 'CD Projekt Red',    img: steamImg(1091500), hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Сюжет', 'Экшн'],     opts: ['dlc', 'ru'],     source: 'steam' },
    { title: 'The Witcher 3: Wild Hunt',         short: 'Witcher 3',        group: 'CD Projekt Red',    img: steamImg(292030),  hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Сюжет', 'Фэнтези'],  opts: ['dlc', 'ru'],     source: 'local' },

    // ── Ubisoft ──────────────────────────────────────────────────
    { title: "Assassin's Creed Shadows",         short: 'AC Shadows',       group: 'Ubisoft',           img: steamImg(3159330), hasDlc: true,  tags: ['Открытый мир', 'Стелс', 'Экшн'],            opts: ['dlc'],           source: 'steam' },
    { title: "Assassin's Creed Mirage",          short: 'AC Mirage',        group: 'Ubisoft',           img: steamImg(3035570), hasDlc: true,  tags: ['Открытый мир', 'Стелс', 'Экшн'],            opts: ['dlc'],           source: 'steam' },
    { title: "Assassin's Creed Valhalla",        short: 'AC Valhalla',      group: 'Ubisoft',           img: steamImg(2208920), hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Экшн'],              opts: ['dlc'],           source: 'steam' },
    { title: "Assassin's Creed Odyssey",         short: 'AC Odyssey',       group: 'Ubisoft',           img: steamImg(812140),  hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Экшн'],              opts: ['dlc'],           source: 'steam' },
    { title: "Assassin's Creed II",              short: 'AC II',            group: 'Ubisoft',           img: steamImg(33230),                 tags: ['Открытый мир', 'Стелс', 'Экшн'],            opts: [],                source: 'local' },
    { title: 'Far Cry 6',                        short: 'Far Cry 6',        group: 'Ubisoft',           img: steamImg(2369390), hasDlc: true,  tags: ['Открытый мир', 'Шутер', 'Экшн'],            opts: ['dlc'],           source: 'steam' },
    { title: 'Far Cry 5',                        short: 'Far Cry 5',        group: 'Ubisoft',           img: steamImg(552520),  hasDlc: true,  tags: ['Открытый мир', 'Шутер', 'Кооп'],            opts: ['dlc', 'online'], source: 'steam' },
    { title: 'Watch Dogs 2',                     short: 'Watch Dogs 2',     group: 'Ubisoft',           img: steamImg(447040),  hasDlc: true,  tags: ['Открытый мир', 'Хакинг', 'Экшн'],           opts: ['dlc'],           source: 'steam' },
    { title: 'Watch Dogs: Legion',               short: 'Watch Dogs Legion', group: 'Ubisoft',          img: steamImg(2239550), hasDlc: true,  tags: ['Открытый мир', 'Хакинг', 'Кооп'],           opts: ['dlc', 'online'], source: 'steam' },
    { title: 'For Honor',                        short: 'For Honor',        group: 'Ubisoft',           img: steamImg(304390),  hasDlc: true,  tags: ['Файтинг', 'Кооп'],                          opts: ['dlc', 'online'], source: 'steam' },

    // ── FromSoftware ─────────────────────────────────────────────
    { title: 'ELDEN RING',                       short: 'Elden Ring',       group: 'FromSoftware',      img: steamImg(1245620), hasDlc: true,  tags: ['Souls-like', 'Открытый мир', 'Хардкор'],    opts: ['dlc'],           source: 'steam' },
    { title: 'Dark Souls III',                   short: 'DS3',              group: 'FromSoftware',      img: steamImg(374320),  hasDlc: true,  tags: ['Souls-like', 'Хардкор', 'Экшн'],            opts: ['dlc'],           source: 'steam' },
    { title: 'Sekiro: Shadows Die Twice',        short: 'Sekiro',           group: 'FromSoftware',      img: steamImg(814380),                tags: ['Souls-like', 'Хардкор', 'Стелс'],           opts: [],                source: 'steam' },
    { title: 'Armored Core VI: Fires of Rubicon', short: 'AC6',            group: 'FromSoftware',      img: steamImg(1888160), hasDlc: true,  tags: ['Роботы', 'Хардкор', 'Экшн'],                opts: ['dlc'],           source: 'steam' },

    // ── PlayStation Studios ───────────────────────────────────────
    { title: "Marvel's Spider-Man 2",            short: 'Spider-Man 2',     group: 'PlayStation',       img: steamImg(2651280), hasDlc: true,  tags: ['Открытый мир', 'Экшн', 'Супергерой'],       opts: ['dlc'],           source: 'steam' },
    { title: 'God of War Ragnarök',              short: 'GoW Ragnarök',     group: 'PlayStation',       img: steamImg(2322010), hasDlc: true,  tags: ['Экшн', 'Сюжет', 'Мифология'],               opts: ['dlc'],           source: 'local' },
    { title: "Ghost of Tsushima DIRECTOR'S CUT", short: 'Ghost of Tsushima', group: 'PlayStation',     img: steamImg(2215430), hasDlc: true,  tags: ['Открытый мир', 'Самурай', 'Стелс'],         opts: ['dlc'],           source: 'local' },
    { title: 'The Last of Us Part I',            short: 'TLOU 1',           group: 'PlayStation',       img: steamImg(1888930),               tags: ['Хоррор', 'Сюжет', 'Выживание'],             opts: [],                source: 'steam' },
    { title: 'The Last of Us Part II Remastered', short: 'TLOU 2',         group: 'PlayStation',       img: steamImg(2531310), hasDlc: true,  tags: ['Хоррор', 'Сюжет', 'Выживание'],             opts: ['dlc'],           source: 'steam' },
    { title: 'Helldivers 2',                     short: 'Helldivers 2',     group: 'PlayStation',       img: steamImg(553850),  hasDlc: true,  tags: ['Кооп', 'Шутер', 'Мультиплеер'],             opts: ['dlc', 'online'], source: 'steam' },
    { title: 'Detroit: Become Human',            short: 'Detroit',          group: 'PlayStation',       img: steamImg(1222140),               tags: ['Сюжет', 'Интерактивное кино', 'Фантастика'], opts: [],                source: 'local' },
    { title: "Death Stranding Director's Cut",   short: 'Death Stranding',  group: 'PlayStation',       img: steamImg(1850570), hasDlc: true,  tags: ['Открытый мир', 'Сюжет', 'Необычное'],       opts: ['dlc'],           source: 'steam' },
    { title: 'God of War',                       short: 'God of War 2018',  group: 'PlayStation',       img: steamImg(1593500),               tags: ['Экшн', 'Сюжет', 'Мифология'],               opts: [],                source: 'local' },
    { title: 'Days Gone',                        short: 'Days Gone',        group: 'PlayStation',       img: steamImg(1259420),               tags: ['Открытый мир', 'Зомби', 'Выживание'],       opts: [],                source: 'steam' },

    // ── Gearbox ──────────────────────────────────────────────────
    { title: 'Borderlands 3',                    short: 'BL3',              group: 'Gearbox',           img: steamImg(397540),  hasDlc: true,  tags: ['Шутер', 'RPG', 'Кооп', 'Юмор'],             opts: ['dlc', 'online'], source: 'steam' },
    { title: 'Borderlands 2',                    short: 'BL2',              group: 'Gearbox',           img: steamImg(49520),   hasDlc: true,  tags: ['Шутер', 'RPG', 'Кооп', 'Юмор'],             opts: ['dlc', 'online'], source: 'local' },

    // ── Bethesda ─────────────────────────────────────────────────
    { title: 'Fallout 4',                        short: 'FO4',              group: 'Bethesda',          img: steamImg(377160),  hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Постапокалипсис'],   opts: ['dlc', 'ru'],     source: 'steam' },
    { title: 'Fallout: New Vegas',               short: 'FNV',              group: 'Bethesda',          img: steamImg(22380),   hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Постапокалипсис'],   opts: ['dlc'],           source: 'local' },
    { title: 'Fallout 3',                        short: 'FO3',              group: 'Bethesda',          img: steamImg(22300),   hasDlc: true,  tags: ['Открытый мир', 'RPG', 'Постапокалипсис'],   opts: ['dlc'],           source: 'steam' },
    { title: 'Fallout 76',                       short: 'FO76',             group: 'Bethesda',          img: steamImg(1151340), hasDlc: true,  tags: ['Открытый мир', 'Мультиплеер', 'Постапокалипсис'], opts: ['dlc', 'online'], source: 'steam' },

    // ── Инди • Roguelike ─────────────────────────────────────────
    { title: 'Hades',                            short: 'Hades',            group: 'Инди • Roguelike',  img: steamImg(1145360),               tags: ['Roguelike', 'Экшн', 'Сюжет'],               opts: [],                source: 'steam' },
    { title: 'Hades II',                         short: 'Hades II',         group: 'Инди • Roguelike',  img: steamImg(1145350),               tags: ['Roguelike', 'Экшн'],                        opts: [],                source: 'steam' },
    { title: 'Dead Cells',                       short: 'Dead Cells',       group: 'Инди • Roguelike',  img: steamImg(588650),  hasDlc: true,  tags: ['Roguelike', 'Метроидвания', 'Хардкор'],     opts: ['dlc'],           source: 'steam' },
    { title: 'Balatro',                          short: 'Balatro',          group: 'Инди • Roguelike',  img: steamImg(2379780),               tags: ['Roguelike', 'Карточная'],                   opts: [],                source: 'steam' },
    { title: 'Slay the Spire',                   short: 'StS',              group: 'Инди • Roguelike',  img: steamImg(646570),  hasDlc: true,  tags: ['Roguelike', 'Карточная'],                   opts: ['dlc'],           source: 'steam' },

    // ── Инди • Платформер ────────────────────────────────────────
    { title: 'Hollow Knight',                    short: 'Hollow Knight',    group: 'Инди • Платформер', img: steamImg(367520),                tags: ['Метроидвания', 'Хардкор', 'Атмосфера'],     opts: [],                source: 'steam' },
    { title: 'Celeste',                          short: 'Celeste',          group: 'Инди • Платформер', img: steamImg(504230),                tags: ['Платформер', 'Хардкор', 'Сюжет'],           opts: [],                source: 'steam' },
    { title: 'Cuphead',                          short: 'Cuphead',          group: 'Инди • Платформер', img: steamImg(268910),  hasDlc: true,  tags: ['Платформер', 'Хардкор', 'Кооп'],            opts: ['dlc', 'online'], source: 'steam' },

    // ── Инди • RPG ───────────────────────────────────────────────
    { title: 'Stardew Valley',                   short: 'Stardew',          group: 'Инди • RPG',        img: steamImg(413150),                tags: ['Фарминг', 'Расслабляющее', 'Кооп'],         opts: ['online'],        source: 'local' },
    { title: 'Undertale',                        short: 'Undertale',        group: 'Инди • RPG',        img: steamImg(391540),                tags: ['RPG', 'Сюжет', 'Необычное'],                opts: [],                source: 'steam' },
    { title: 'Disco Elysium',                    short: 'Disco Elysium',    group: 'Инди • RPG',        img: steamImg(632470),  hasDlc: true,  tags: ['RPG', 'Сюжет', 'Детектив'],                 opts: ['dlc', 'ru'],     source: 'steam' },
    { title: 'Outer Wilds',                      short: 'Outer Wilds',      group: 'Инди • RPG',        img: steamImg(753640),  hasDlc: true,  tags: ['Приключение', 'Исследование', 'Сюжет'],     opts: ['dlc'],           source: 'steam' },

    // ── Инди • Выживание ─────────────────────────────────────────
    { title: 'Terraria',                         short: 'Terraria',         group: 'Инди • Выживание',  img: steamImg(105600),                tags: ['Выживание', 'Крафт', 'Кооп', 'Песочница'],  opts: ['online'],        source: 'local' },
    { title: 'Subnautica',                       short: 'Subnautica',       group: 'Инди • Выживание',  img: steamImg(264710),                tags: ['Выживание', 'Исследование', 'Хоррор'],      opts: [],                source: 'steam' },
    { title: 'Valheim',                          short: 'Valheim',          group: 'Инди • Выживание',  img: steamImg(892970),  hasDlc: true,  tags: ['Выживание', 'Крафт', 'Кооп', 'Викинги'],    opts: ['dlc', 'online'], source: 'local' },
    { title: 'Satisfactory',                     short: 'Satisfactory',     group: 'Инди • Выживание',  img: steamImg(526870),  hasDlc: true,  tags: ['Крафт', 'Строительство', 'Кооп'],           opts: ['dlc', 'online'], source: 'steam' },

    // ── Инди • Кооп ──────────────────────────────────────────────
    { title: 'Deep Rock Galactic',               short: 'DRG',              group: 'Инди • Кооп',       img: steamImg(548430),  hasDlc: true,  tags: ['Кооп', 'Шутер', 'Подземелье'],              opts: ['dlc', 'online'], source: 'steam' },
    { title: 'It Takes Two',                     short: 'It Takes Two',     group: 'Инди • Кооп',       img: steamImg(1426210),               tags: ['Кооп', 'Платформер', 'Сюжет'],              opts: ['online'],        source: 'steam' },
    { title: 'Among Us',                         short: 'Among Us',         group: 'Инди • Кооп',       img: steamImg(945360),                tags: ['Мультиплеер', 'Для всех', 'Казуальное'],    opts: ['online'],        source: 'local' },

  ];
}
