// ==UserScript==
// @name         Personal: Several Raids
// @namespace    hh-raids
// @author       arush
// @version      1.14.0
// @description  Grey out or hide raid cards based on shard progress, villain id, or star level
// @match        *://*.hentaiheroes.com/*
// @match        *://*.haremheroes.com/*
// @downloadURL  https://raw.githubusercontent.com/aruuush/several-extras/main/several_raids.user.js
// @updateURL    https://raw.githubusercontent.com/aruuush/several-extras/main/several_raids.user.js
// @icon         https://cdn3.iconfinder.com/data/icons/sex-6/128/XXX_3-02-512.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(async function severalRaids() {
    'use strict';

    /* --------------------------------------------
     * Utility: Save and Load Last Villain ID
     * ------------------------------------------ */
    function saveLastVillain() {
        const villains = document.querySelectorAll('.script-fight-a-villain-menu .menu-villain[href*="id_opponent="]');
        if (!villains.length) return;

        let maxId = 0;
        villains.forEach(v => {
            const match = v.href.match(/id_opponent=(\d+)/);
            if (match) {
                const id = parseInt(match[1], 10);
                if (id > maxId) maxId = id;
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

    /* --------------------------------------------
     * Core: Determine whether a raid card should be hidden
     * ------------------------------------------ */
    function shouldGreyOutRaid(CONFIG, lastVillainId, card) {
        // Check if its a seasons raid
        if (CONFIG.dontHideSeasons.enabled) {
            const seasonsLink = card.querySelector('a[href="/season-arena.html"]');
            if (seasonsLink) {
                return false;
            }
        }

        // --- Rule 1: Completed raid (100/100 shards)
        const shardText = card.querySelector('.shards p span')?.textContent.trim() ?? '';
        if (CONFIG.greyOutCompletedRaids.enabled && shardText === '100/100') {
            return true;
        }

        // --- Rule 2: 3-star girl with < 40 shards
        let currentShardCount = parseInt(shardText.split('/')[0], 10);
        if (isNaN(currentShardCount)) currentShardCount = 0;

        const graded = card.querySelector('.graded');
        const gCount = graded ? graded.querySelectorAll('g').length : 0;

        if (CONFIG.greyOut3StarsBelow40.enabled && gCount === 3 && currentShardCount < 40) {
            return true;
        }

        // --- Rule 3: Higher opponent ID than last villain
        if (CONFIG.greyOutHigherIdThanLastVillain.enabled && lastVillainId !== null) {
            const opponentLink = card.querySelector('a[href*="id_opponent="]')?.getAttribute('href');
            if (opponentLink) {
                const match = opponentLink.match(/id_opponent=(\d+)/);
                if (match) {
                    const opponentId = parseInt(match[1], 10);
                    if (opponentId > lastVillainId) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /* --------------------------------------------
     * Core: Apply raid-hiding logic
     * ------------------------------------------ */
    function greyOutRaids(CONFIG) {
        const lastVillainId = getLastVillain();

        document.querySelectorAll('.raid-card').forEach(card => {
            if (shouldGreyOutRaid(CONFIG, lastVillainId, card)) {
                card.classList.add('grey-overlay');
            }
        });
    }

    /* --------------------------------------------
     * Configuration: HH++ Settings Integration
     * ------------------------------------------ */
    async function loadConfig() {
        // defaults
        let config = {
            greyOutCompletedRaids:
                { enabled: true },
            greyOut3StarsBelow40:
                { enabled: true },
            greyOutHigherIdThanLastVillain:
                { enabled: true },
            dontHideSeasons:
                { enabled: false },
            hideSeveralRaids:
                { enabled: false },
        };

        // changing config requires HH++
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

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOutCompletedRaids',
                label: 'Grey out raids with 100/100 shards obtained (Can have incomplete skins or can be mysterious raids)',
                default: true,
            },
            run() {
                config.greyOutCompletedRaids = {
                    enabled: true,
                };
            },
        });
        config.greyOutCompletedRaids.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOut3StarsBelow40',
                label: 'Grey out 3 star girls with less than 40 shards obtained',
                default: true,
            },
            run() {
                config.greyOut3StarsBelow40 = {
                    enabled: true,
                };
            },
        });
        config.greyOut3StarsBelow40.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'greyOutHigherIdThanLastVillain',
                label: 'Grey out raids who are on villains out of reach',
                default: true,
            },
            run() {
                config.greyOutHigherIdThanLastVillain = {
                    enabled: true,
                };
            }
        });
        config.greyOutHigherIdThanLastVillain.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'dontHideSeasons',
                label: 'Don\'t grey out incomplete seasons raids (Can be any girl)',
                default: false,
            },
            run() {
                config.dontHideSeasons = {
                    enabled: true,
                };
            }
        });
        config.dontHideSeasons.enabled = false;

        registerModule({
            group: 'SeveralRaids',
            configSchema: {
                baseKey: 'hideSeveralRaids',
                label: 'Hide all greyed out raids',
                default: false,
            },
            run() {
                config.hideSeveralRaids = {
                    enabled: true,
                };
            }
        });
        config.hideSeveralRaids.enabled = false;

        hhLoadConfig();
        runModules();

        return config;
    }

    if (!unsafeWindow['hhPlusPlusConfig']) {
        console.log(`[Several Raids] waiting for HHPlusPlus`);
        $(document).one('hh++-bdsm:loaded', () => {
            console.log('[Several Raids] HHPlusPlus ready, restart script');
            severalRaids();
        });
        return;
    }

    /* --------------------------------------------
     * Initialization
     * ------------------------------------------ */
    const CONFIG = await loadConfig();
    console.log('[Several Raids] Config loaded:', CONFIG);

    // Detect villain menu appearance to save last villain id
    const villainObserver = new MutationObserver((_, observer) => {
        const menu = document.querySelector('.script-fight-a-villain-menu');
        if (menu) {
            saveLastVillain();
            observer.disconnect();
        }
    });
    villainObserver.observe(document.body, { childList: true, subtree: true });

    // Initial execution
    greyOutRaids(CONFIG);
    if (document.querySelector('.script-fight-a-villain-menu')) {
        saveLastVillain();
    }

    if (CONFIG.hideSeveralRaids.enabled) {
        GM_addStyle(`.raid-card.grey-overlay { display: none !important; }`);
    }

    // Watch for new raid cards dynamically (with short debounce)
    let raidTimeout;
    const raidObserver = new MutationObserver(() => {
        clearTimeout(raidTimeout);
        raidTimeout = setTimeout(() => greyOutRaids(CONFIG), 10);
    });
    raidObserver.observe(document.body, { childList: true, subtree: true });
})();
