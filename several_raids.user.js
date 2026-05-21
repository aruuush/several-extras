// ==UserScript==
// @name         Several Raids
// @namespace    hh-several-raids
// @author       arush
// @version      2.0.2
// @description  Grey out or hide raid cards based on shard progress, villain id, or star level (Only Tested on hentaiheroes).
// @match        *://*.hentaiheroes.com/*
// @match        *://*.haremheroes.com/*
// @match        *://*.gayharem.com/*
// @match        *://*.comixharem.com/*
// @match        *://*.hornyheroes.com/*
// @match        *://*.pornstarharem.com/*
// @match        *://*.transpornstarharem.com/*
// @match        *://*.gaypornstarharem.com/*
// @match        *://*.mangarpg.com/*
// @downloadURL  https://raw.githubusercontent.com/aruuush/several-extras/main/several_raids.user.js
// @updateURL    https://raw.githubusercontent.com/aruuush/several-extras/main/several_raids.user.js
// @icon         https://cdn3.iconfinder.com/data/icons/sex-6/128/XXX_3-02-512.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

if (unsafeWindow.__severalRaidsInitialized) {
    return;
}
unsafeWindow.__severalRaidsInitialized = true;

function waitForHHPlusPlus(cb) {
    if (unsafeWindow.hhPlusPlusConfig) {
        cb();
        return;
    }

    let done = false;

    const finish = () => {
        if (done) return;
        done = true;
        cb();
    };

    document.addEventListener('hh++-bdsm:loaded', finish, { once: true });

    const poll = setInterval(() => {
        if (unsafeWindow.hhPlusPlusConfig) {
            clearInterval(poll);
            finish();
        }
    }, 10);
}

async function severalRaids() {
    'use strict';

    const { HHPlusPlus: { Helpers: { doWhenSelectorAvailable } } } = unsafeWindow;

    const GREY_CACHE_KEY = 'sr_grey_cache';
    const GIRL_DICT_KEY = 'sr_girl_dict';

    const isHomePage = window.location.pathname.includes('home.html');
    const isRaidsPage = window.location.pathname.includes('love-raids');

    // Utility: Villain ID
    function saveLastVillain() {
        const villains = document.querySelectorAll('.script-fight-a-villain-menu .menu-villain[href*="id_opponent="]');
        if (!villains.length) return;

        let maxId = 0;
        villains.forEach(v => {
            const match = v.href.match(/id_opponent=(\d+)/);
            if (match) {
                const id = parseInt(match[1], 10);
                if (id > maxId && id < 20) {
                    maxId = id;
                }
            }
        });

        if (maxId > 0) {
            GM_setValue('lastVillainId', maxId);
            console.log('[Several Raids] Saved last villain id:', maxId);
        }
    }

    function getLastVillain() {
        return GM_getValue('lastVillainId', null);
    }

    // Utility: Lightweight girl dict
    async function buildAndSaveGirlDict() {
        const girlDictionary = await unsafeWindow.HHPlusPlus.Helpers.getGirlDictionary();
        const dict = {};

        girlDictionary.forEach((girl, id) => {
            dict[id] = {
                shards: girl.shards ?? 0,
                nb_grades: girl.grade ?? 0,
                grade_skins_data: (girl.preview?.grade_skins_data ?? []).map(s => ({
                    is_owned: s.is_owned,
                    shards_count: s.shards_count ?? 0,
                })),
            };
        });

        GM_setValue(GIRL_DICT_KEY, dict);
        return dict;
    }

    function loadGirlDict() {
        return GM_getValue(GIRL_DICT_KEY, {});
    }

    // Core: Grey out decision
    function shouldGreyOut(CONFIG, lastVillainId, raidData, girlInfo) {
        const isSeason = raidData.raid_module_type === 'season';

        const shards = girlInfo?.shards ?? 0;
        const nbGrades = girlInfo?.nb_grades ?? 0;
        const skinData = girlInfo?.grade_skins_data ?? [];

        // Season logic
        if (isSeason) {
            if (CONFIG.dontHideSeasons.enabled) {
                if (shards < 100) return false;

                const hasIncompleteSkin = skinData.some(s => !s.is_owned);
                return !hasIncompleteSkin;
            }
        }

        // Rule 1: 100/100 shards
        if (CONFIG.greyOutCompletedRaids.enabled && shards === 100) return true;

        // Rule 2: 3-star girl with < 40 shards
        if (CONFIG.greyOut3StarsBelow40.enabled && nbGrades === 3 && shards < 40) return true;

        // Rule 3: villain out of reach
        if (CONFIG.greyOutHigherIdThanLastVillain.enabled && lastVillainId !== null) {
            if (raidData.raid_module_type === 'troll' || raidData.raid_module_type === 'champion') {
                if (raidData.raid_module_pk > lastVillainId) return true;
            }
        }

        return false;
    }

    // Core: Build full grey cache from love_raids
    function buildGreyCache(CONFIG) {
        const raids = love_raids ?? [];
        const girlDict = loadGirlDict();
        const lastVillainId = getLastVillain();
        const cache = {};

        for (const raidData of raids) {
            // Prefer live love_raids girl_data, supplement with our dict
            const liveGirl = raidData.girl_data;
            const dictGirl = girlDict[`${raidData.id_girl}`];

            const girlInfo = {
                shards: liveGirl?.shards ?? dictGirl?.shards ?? 0,
                nb_grades: liveGirl?.nb_grades ?? dictGirl?.nb_grades ?? 0,
                grade_skins_data: liveGirl?.preview?.grade_skins_data?.map(s => ({
                    is_owned: s.is_owned,
                    shards_count: s.shards_count ?? 0,
                })) ?? dictGirl?.grade_skins_data ?? [],
            };

            const grey = shouldGreyOut(CONFIG, lastVillainId, raidData, girlInfo);
            if (grey) {
                cache[raidData.id_raid] = true;
            }
            // Not greyed = not stored (clean cache)
        }

        GM_setValue(GREY_CACHE_KEY, cache);
        return cache;
    }

    // Core: Apply cache to DOM
    function applyGreyCache(cache) {
        const raids = love_raids ?? [];
        const activeRaidIds = new Set(raids.map(r => r.id_raid));

        document.querySelectorAll('.raid-card').forEach(card => {
            const raidId = parseInt(card.getAttribute('id_raid'), 10);
            if (!raidId) return;

            // Remove overlay for raids no longer in love_raids
            if (!activeRaidIds.has(raidId)) {
                card.classList.remove('grey-overlay');
                return;
            }

            if (cache[raidId]) {
                card.classList.add('grey-overlay');
            } else {
                card.classList.remove('grey-overlay');
            }
        });
    }

    // Core: Full grey out run
    function greyOutRaids(CONFIG) {
        const cache = buildGreyCache(CONFIG);
        applyGreyCache(cache);
    }

    // Core: Apply existing cache immediately, then rebuild
    function greyOutRaidsWithCache(CONFIG) {
        const existing = GM_getValue(GREY_CACHE_KEY, null);
        if (existing) {
            applyGreyCache(existing);
        }
        greyOutRaids(CONFIG);
    }

    // Configuration: HH++ Settings Integration
    async function loadConfig() {
        let config = {
            greyOutCompletedRaids:
                { enabled: true },
            greyOut3StarsBelow40:
                { enabled: true },
            greyOutHigherIdThanLastVillain:
                { enabled: true },
            dontHideSeasons:
                { enabled: false },
        };

        const {
            loadConfig: hhLoadConfig,
            registerGroup,
            registerModule,
            runModules,
        } = hhPlusPlusConfig;

        registerGroup({
            key: 'SeveralRaids',
            name: 'Several Raids'
        });

        const sheet = document.createElement('style');
        sheet.textContent = `
            h4.SeveralRaids.selected::after {
                content: 'v${GM_info.script.version}';
                display: block;
                position: absolute;
                top: -10px;
                right: -15px;
                font-size: 10px;
            }
            h4.SeveralRaids.selected:last-child::after { right: 0; }
        `;
        document.head.appendChild(sheet);

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOutCompletedRaids',
                label: 'Grey out raids with 100/100 shards obtained',
                default: true,
            },
            run() { config.greyOutCompletedRaids = { enabled: true }; },
        });
        config.greyOutCompletedRaids.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOut3StarsBelow40',
                label: 'Grey out 3 star girls with less than 40 shards obtained',
                default: true,
            },
            run() { config.greyOut3StarsBelow40 = { enabled: true }; },
        });
        config.greyOut3StarsBelow40.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOutHigherIdThanLastVillain',
                label: 'Grey out raids who are on villains out of reach',
                default: true,
            },
            run() { config.greyOutHigherIdThanLastVillain = { enabled: true }; },
        });
        config.greyOutHigherIdThanLastVillain.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'dontHideSeasons',
                label: 'Don\'t grey out incomplete seasons raids (Can be any girl)',
                default: false,
            },
            run() { config.dontHideSeasons = { enabled: true }; },
        });
        config.dontHideSeasons.enabled = false;

        hhLoadConfig();
        runModules();

        return config;
    }

    // Initialization
    const CONFIG = await loadConfig();

    // Always watch for villain menu regardless of page
    const villainObserver = new MutationObserver((_, observer) => {
        const menu = document.querySelector('.script-fight-a-villain-menu');
        if (menu) {
            saveLastVillain();
            observer.disconnect();
            if (isRaidsPage) {
                doWhenSelectorAvailable('.raid-card', () => {
                    greyOutRaids(CONFIG);
                });
            }
        }
    });
    villainObserver.observe(document.body, { childList: true, subtree: true });

    // Home page: build and save girl dict
    if (isHomePage) {
        await buildAndSaveGirlDict();
        return;
    }

    if (!isRaidsPage) {
        return;
    }

    // Raids page
    if (document.querySelector('.script-fight-a-villain-menu')) {
        saveLastVillain();
    }

    // Apply cached grey immediately, then rebuild
    doWhenSelectorAvailable('.raid-card', () => {
        greyOutRaidsWithCache(CONFIG);
    });
}

waitForHHPlusPlus(() => {
    severalRaids();
});