// ==UserScript==
// @name         Several Penta Drills
// @namespace    hh-pentadrill
// @author       arush
// @version      1.0.1
// @description  Replace class icon with a persistent star toggle on Penta Drill opponents (Only Tested on hentaiheroes).
// @match        *://*.hentaiheroes.com/penta-drill-arena*
// @match        *://*.haremheroes.com/penta-drill-arena*
// @match        *://*.gayharem.com/penta-drill-arena*
// @match        *://*.comixharem.com/penta-drill-arena*
// @match        *://*.hornyheroes.com/penta-drill-arena*
// @match        *://*.pornstarharem.com/penta-drill-arena*
// @match        *://*.transpornstarharem.com/penta-drill-arena*
// @match        *://*.gaypornstarharem.com/penta-drill-arena*
// @match        *://*.mangarpg.com/penta-drill-arena*
// @downloadURL  https://raw.githubusercontent.com/aruuush/several-extras/main/several_pds.user.js
// @updateURL    https://raw.githubusercontent.com/aruuush/several-extras/main/several_pds.user.js
// @icon         https://cdn3.iconfinder.com/data/icons/sex-6/128/XXX_3-02-512.png
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const STORAGE_KEY = "hh_pentadrill_starred_opponents";

    // --- Storage ---
    function loadStarred() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? new Set(JSON.parse(raw)) : new Set();
        } catch {
            return new Set();
        }
    }

    function saveStarred(set) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
        } catch {}
    }

    // --- Star UI ---
    function makeStar(isStarred) {
        const el = document.createElement("span");
        el.textContent = isStarred ? "\u2605" : "\u2606";
        el.classList.add("hh-star-toggle");
        el.style.cursor = "pointer";
        el.style.fontSize = "35px";
        el.style.position = "absolute";
        el.style.right = "10px";
        el.style.color = isStarred ? "#ffd700" : "#bbb";
        el.style.userSelect = "none";
        return el;
    }

    function updateStar(el, starred) {
        el.textContent = starred ? "\u2605" : "\u2606";
        el.style.color = starred ? "#ffd700" : "#bbb";
    }

    // --- Core logic ---
    function decorateOpponents() {
        const starred = loadStarred();
        const containers = document.querySelectorAll(".opponent-info-container");

        containers.forEach(box => {
            const nameEl = box.querySelector(".player-name");
            if (!nameEl) return;

            const name = nameEl.textContent.trim();
            if (!name) return;

            // avoid duplicates
            if (box.querySelector(".hh-star-toggle")) return;

            const isStarred = starred.has(name);
            const star = makeStar(isStarred);

            star.addEventListener("click", e => {
                e.stopPropagation();
                const nowStarred = !starred.has(name);
                
                if (nowStarred) starred.add(name);
                else starred.delete(name);

                saveStarred(starred);
                updateStar(star, nowStarred);
            });

            // Replace class icon with the star
            const classBox = box.querySelector('.player-class');
            if (classBox) {
                classBox.innerHTML = "";
                classBox.appendChild(star);
            }
        });
    }

    // --- Initialize ---
    function init() {
        const isPentaDrill = !!document.querySelector('.penta-drill-main-container');
        if (!isPentaDrill) return;

        decorateOpponents();

        // Watch only the opponents list (not whole body)
        const target = document.querySelector('.opponents-container');
        if (target) {
            const observer = new MutationObserver(() => {
                decorateOpponents();
            });
            observer.observe(target, { childList: true, subtree: true });
        }
    }

    // Run when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
