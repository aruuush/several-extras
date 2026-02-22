// ==UserScript==
// @name         Several Yeets
// @namespace    hh-several-yeets
// @author       arush
// @version      1.0.8
// @description  Removes a few unnecessary things to make it less cluttered (Only Tested on hentaiheroes).
// @match        *://*.hentaiheroes.com/*
// @match        *://*.haremheroes.com/*
// @match        *://*.gayharem.com/*
// @match        *://*.comixharem.com/*
// @match        *://*.hornyheroes.com/*
// @match        *://*.pornstarharem.com/*
// @match        *://*.transpornstarharem.com/*
// @match        *://*.gaypornstarharem.com/*
// @match        *://*.mangarpg.com/*
// @downloadURL  https://raw.githubusercontent.com/aruuush/several-extras/main/several_yeets.user.js
// @updateURL    https://raw.githubusercontent.com/aruuush/several-extras/main/several_yeets.user.js
// @icon         https://cdn3.iconfinder.com/data/icons/sex-6/128/XXX_3-02-512.png
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-start
// ==/UserScript==

if (unsafeWindow.__severalYeetsInitialized) {
    return;
}
unsafeWindow.__severalYeetsInitialized = true;

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

async function severalYeets() {
    'use strict';

    function removeAllBackgrounds() {
        GM_addStyle(`
            #bg_all .fixed_scaled img {
                display: none !important;
            }
        `);
    }

    function removeWaifuButtons() {
        if (window.location.pathname.includes('home.html')) {
            GM_addStyle(`
                .waifu-buttons-container {
                    display: none !important;
                }
            `);
        }
    }

    function removeCreditsFromLabyrinthPlusPlus() {
        if (window.location.pathname.includes('labyrinth')) {
            GM_addStyle(`
                .credits {
                    display: none !important;
                }
            `);
        }
    }

    function removeMarketAds() {
        if (window.location.pathname.includes('shop.html')) {
            GM_addStyle(`
                #ad_shop {
                    display: none !important;
                }
            `);
        }
    }

    function removeExcessLabyrinthSlots() {
        if (!window.location.pathname.includes('labyrinth')) return;

        function filterLabyrinthSlots(root = document) {
            const slots = root.querySelectorAll('.shop-item');

            slots.forEach(slot => {
                const button = slot.querySelector('.buy-item');
                if (!button) return;

                const index = Number(button.getAttribute('slot_index'));
                if (index > 3) {
                    slot.remove();
                }
            });
        }

        // Initial run
        filterLabyrinthSlots();

        // Observe for re-renders
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== 1) return;

                    if (
                        node.matches?.('.shop-item') ||
                        node.querySelector?.('.shop-item')
                    ) {
                        filterLabyrinthSlots(node);
                    }
                });
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    function removeChampionsGirl() {
        if (window.location.pathname.includes('champions') ||
            window.location.pathname.includes('club-champion')) {
            GM_addStyle(`
                .champions-over__girl-image {
                    display: none !important;
                }
            `);
        }
    }

    function removeClaimAllButtonFromPD() {
        if (window.location.pathname.includes('penta-drill')) {
            GM_addStyle(`
                #claim-all {
                    display: none !important;
                }
            `);
        }
    }

    function changeGirlsToPokemons() {
        if (!window.location.pathname.includes('leagues') &&
            !window.location.pathname.includes('waifu') &&
            !window.location.pathname.includes('characters') &&
            !window.location.pathname.includes('pvp-arena') &&
            !window.location.pathname.includes('champions') &&
            !window.location.pathname.includes('club-champion')) {
            return;
        }

        const oldImagesURL = window.IMAGES_URL
        window.IMAGES_URL = 'https://hh.hh-content.com'
        $('img').each((i, el) => {
            const oldhref = $(el).attr('src')
            if (oldhref) {
                let newhref = oldhref.replace(oldImagesURL, window.IMAGES_URL)
                if (oldhref.includes("pictures/girls/")) {
                    const pokeID = ("00" + Math.floor(Math.random() * (898) + 1)).substr(-3);
                    newhref = `https://assets.` + `pokemon.` + `com/assets/cms2/img/pokedex/detail/${pokeID}.png`
                }
                if (newhref !== oldhref) {
                    $(el).attr('src', newhref)
                }
            }
        })
        const observer = new MutationObserver(() => {
            $('img').each((i, el) => {
                const oldhref = $(el).attr('src')
                if (oldhref) {
                    let newhref = oldhref.replace(oldImagesURL, window.IMAGES_URL)
                    if (oldhref.includes("pictures/girls/")) {
                        const pokeID = ("00" + Math.floor(Math.random() * (898) + 1)).substr(-3);
                        newhref = `https://assets.` + `pokemon.` + `com/assets/cms2/img/pokedex/detail/${pokeID}.png`
                    }
                    if (newhref !== oldhref) {
                        $(el).attr('src', newhref)
                    }
                }
            })
        });
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });
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
                label: 'Remove claim all button from penta drill',
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

    /* --------------------------------------------
     * Initialization
     * ------------------------------------------ */
    const CONFIG = await loadConfig();

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
}

waitForHHPlusPlus(() => {
    severalYeets();
});