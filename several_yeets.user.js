// ==UserScript==
// @name         Several Yeets
// @namespace    hh-several-yeets
// @author       arush
// @version      1.0.0
// @description  Removes a few unnecessary things to make it less cluttered.
// @match        *://*.hentaiheroes.com/*
// @match        *://*.haremheroes.com/*
// @downloadURL  https://raw.githubusercontent.com/aruuush/several-extras/main/several_yeets.user.js
// @updateURL    https://raw.githubusercontent.com/aruuush/several-extras/main/several_yeets.user.js
// @icon         https://cdn3.iconfinder.com/data/icons/sex-6/128/XXX_3-02-512.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-idle
// ==/UserScript==

(async function severalYeets () {
    'use strict';

    function removeAllBackgrounds() {
        doWhenSelectorAvailable('#bg_all .fixed_scaled img', () => {
            const img = document.querySelector('#bg_all .fixed_scaled img');
            img.remove();
            console.log('Removed backgrounds');
        });
    }

    function removeWaifuButtons() {
        if (!window.location.pathname.includes('home.html')) {
            return;
        }

        doWhenSelectorAvailable('.waifu-buttons-container', () => {
            const container = document.querySelector('.waifu-buttons-container');
            container.style.display = 'none';
            console.log('Removed waifu buttons');
        });
    }

    function removeCreditsFromLabyrinthPlusPlus() {
        if (!window.location.pathname.includes('labyrinth')) {
            return;
        }

        doWhenSelectorAvailable('.credits', () => {
            const el = document.querySelector('.credits');
            el.remove();
            console.log('Removed credits from Labyrinth++');
        });
    }

    function removeMarketAds() {
        if (window.location.pathname.includes('shop.html')) {
            doWhenSelectorAvailable('#ad_shop', (el) => {
                el.remove();
                console.log('Removed market ads');
            });
        }
    }

    function removeExcessLabyrinthSlots() {
        if (!window.location.pathname.includes('labyrinth')) return;

        function filterLabyrinthSlots() {
            // In case there are multiple shops / lists rendered
            const containers = document.querySelectorAll('.shop-items-list');
            if (!containers.length) return;

            containers.forEach(container => {
                const slots = container.querySelectorAll('.shop-item');
                slots.forEach(slot => {
                    const button = slot.querySelector('.buy-item');
                    if (!button) return;

                    const index = parseInt(button.getAttribute('slot_index'), 10);
                    if (!isNaN(index) && index > 3) {
                        slot.remove();
                    }
                });
            });
        }

        // Run once for whatever is currently on screen
        doWhenSelectorAvailable('.shop-items-list', filterLabyrinthSlots);

        // Watch the whole document for shop re-renders
        const observer = new MutationObserver((mutations) => {
            let shouldRun = false;

            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== 1) continue; // not an element

                    // If a shop list or shop item (or a container with them) was added
                    if (
                        node.matches?.('.shop-items-list, .shop-item') ||
                        node.querySelector?.('.shop-items-list, .shop-item')
                    ) {
                        shouldRun = true;
                        break;
                    }
                }
                if (shouldRun) break;
            }

            if (shouldRun) {
                doWhenSelectorAvailable('.shop-items-list', filterLabyrinthSlots);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function removeChampionsGirl() {
        if (!window.location.pathname.includes('champions') &&
            !window.location.pathname.includes('club-champion')) {
            return;
        }

        doWhenSelectorAvailable('.champions-over__girl-image', () => {
            const girlImage = document.querySelector('.champions-over__girl-image');
            if (girlImage) {
                girlImage.remove();
                console.log('Removed champions girl image');
            }
        });
    }

    function removeClaimAllButtonFromPD() {
        if (!window.location.pathname.includes('penta-drill')) {
            return;
        }

        doWhenSelectorAvailable('#claim-all', () => {
            const claimAllButton = document.querySelector('#claim-all');

            if (claimAllButton) {
                claimAllButton.remove();
                console.log('Removed Claim All button from Penta Drill');
            }
        });
    }

    function changeGirlsToPokemons() {
        if (!window.location.pathname.includes('leagues') &&
            !window.location.pathname.includes('waifu') &&
            !window.location.pathname.includes('characters') &&
            !window.location.pathname.includes('pvp-arena') &&
            !window.location.pathname.includes('champions')) {
            return;
        }

        const OLD_IMAGES_URL = window.IMAGES_URL;
        window.IMAGES_URL = 'https://hh.hh-content.com';

        // Use a MutationObserver to detect new images instead of a 1ms loop
        const observer = new MutationObserver(() => {
            document.querySelectorAll('img:not([data-rewritten])').forEach(img => {
                const oldSrc = img.src;
                if (!oldSrc) return;

                let newSrc = oldSrc.replace(OLD_IMAGES_URL, window.IMAGES_URL);

                // Replace certain images with Pokémon only once
                if (oldSrc.includes("pictures/girls") && !oldSrc.includes("elements")) {
                    const pokeID = String(Math.floor(Math.random() * 898) + 1).padStart(3, '0');
                    newSrc = `https://assets.pokemon.com/assets/cms2/img/pokedex/detail/${pokeID}.png`;
                }

                if (newSrc !== oldSrc) {
                    img.src = newSrc;
                }

                // Mark image as processed
                img.dataset.rewritten = "true";
            });
        });

        // Observe new elements being added anywhere in the DOM
        observer.observe(document.body, { childList: true, subtree: true });

        // Optionally process all current images once on load
        document.querySelectorAll('img').forEach(img => img.removeAttribute('data-rewritten'));
        observer.takeRecords();
    }

    /* --------------------------------------------
     * Configuration: HH++ Settings Integration
     * ------------------------------------------ */

    async function loadConfig() {
        // defaults
        let config = {
            removeAllBackgrounds:
                { enabled: true },
            removeWaifuButtons:
                { enabled: true },
            removeCreditsFromLabyrinthPlusPlus:
                { enabled: true },
            removeMarketAds:
                { enabled: false },
            removeExcessLabyrinthSlots:
                { enabled: true },
            removeChampionsGirl:
                { enabled: true },
            removeClaimAllButtonFromPD:
                { enabled: true },
            changeGirlsToPokemons:
                { enabled: true },
        };

        // changing config requires HH++
        const {
            loadConfig: hhLoadConfig,
            registerGroup,
            registerModule,
            runModules,
        } = hhPlusPlusConfig;

        registerGroup({
            key: 'several_yeets',
            name: 'Several Yeets',
            description: 'Removes a few unnecessary things to make it less cluttered.',
        });

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeAllBackgrounds',
                label: 'Remove all the backgrounds',
                default: true,
            },
            run() {
                config.removeAllBackgrounds = {
                    enabled: true,
                };
            },
        });
        config.removeAllBackgrounds.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeWaifuButtons',
                label: 'Remove waifu buttons from home screen',
                default: true,
            },
            run() {
                config.removeWaifuButtons = {
                    enabled: true,
                };
            },
        });
        config.removeWaifuButtons.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeCreditsFromLabyrinthPlusPlus',
                label: 'Remove credits from Labyrinth added by Labyrinth++',
                default: true,
            },
            run() {
                config.removeCreditsFromLabyrinthPlusPlus = {
                    enabled: true,
                };
            },
        });
        config.removeCreditsFromLabyrinthPlusPlus.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeMarketAds',
                label: 'Remove ads from market (Useful for people with no monthly card)',
                default: false,
            },
            run() {
                config.removeMarketAds = {
                    enabled: true,
                };
            },
        });
        config.removeMarketAds.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeExcessLabyrinthSlots',
                label: 'Remove excess labyrinth slots (keep only first 4)',
                default: true,
            },
            run() {
                config.removeExcessLabyrinthSlots = {
                    enabled: true,
                };
            }
        });
        config.removeExcessLabyrinthSlots.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeChampionsGirl',
                label: 'Remove champions girl image',
                default: true,
            },
            run() {
                config.removeChampionsGirl = {
                    enabled: true,
                };
            },
        });
        config.removeChampionsGirl.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'removeClaimAllButtonFromPD',
                label: 'Remove Claim All button from Penta Drill',
                default: true,
            },
            run() {
                config.removeClaimAllButtonFromPD = {
                    enabled: true,
                };
            },
        });
        config.removeClaimAllButtonFromPD.enabled = false;

        registerModule({
            group: 'several_yeets',
            configSchema: {
                baseKey: 'changeGirlsToPokemons',
                label: 'Change girls images to Pokemons (Credits to Zoopokemon)',
                default: true,
            },
            run() {
                config.changeGirlsToPokemons = {
                    enabled: true,
                };
            },
        });
        config.changeGirlsToPokemons.enabled = false;

        hhLoadConfig();
        runModules();

        return config;
    }

    if (!unsafeWindow['hhPlusPlusConfig']) {
        log(`waiting for HHPlusPlus`);
        $(document).one('hh++-bdsm:loaded', () => {
            log('HHPlusPlus ready, restart script');
            severalYeets();
        });
        return;
    }

    /* --------------------------------------------
     * Initialization
     * ------------------------------------------ */
    const {
        HHPlusPlus: {
            Helpers: {
                doWhenSelectorAvailable,
            },
        },
    } = unsafeWindow;

    const CONFIG = await loadConfig();
    console.log('[UI] Config loaded:', CONFIG);

    if (CONFIG.removeAllBackgrounds.enabled) {
        removeAllBackgrounds();
    }

    if (CONFIG.removeWaifuButtons.enabled) {
        removeWaifuButtons();
    }

    if (CONFIG.removeCreditsFromLabyrinthPlusPlus.enabled) {
        removeCreditsFromLabyrinthPlusPlus();
    }

    if (CONFIG.removeMarketAds.enabled) {
        removeMarketAds();
    }

    if (CONFIG.removeExcessLabyrinthSlots.enabled) {
        removeExcessLabyrinthSlots();
    }

    if (CONFIG.removeChampionsGirl.enabled) {
        removeChampionsGirl();
    }

    if (CONFIG.removeClaimAllButtonFromPD.enabled) {
        removeClaimAllButtonFromPD();
    }

    if (CONFIG.changeGirlsToPokemons.enabled) {
        changeGirlsToPokemons();
    }
})();
