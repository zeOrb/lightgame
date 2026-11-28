// Ornaments share the diamond's centre and lower branch joint.
const rare = `<g transform="scale(.95)">
<path class="rim-leaf" d="M-27-10Q-41-17-29-31Q-29-18-27-10Z M27 10Q41 17 29 31Q29 18 27 10Z M10-27Q17-41 31-29Q18-29 10-27Z M-10 27Q-17 41-31 29Q-18 29-10 27Z"/>
<path class="rim-wire" d="M-27-10Q-34-24-29-31 M27 10Q34 24 29 31 M10-27Q24-34 31-29 M-10 27Q-24 34-31 29"/>
<path class="rim-jewel" d="M0-41 3-37 0-33-3-37Z M41 0 37 3 33 0 37-3Z M0 41-3 37 0 33 3 37Z M-41 0-37-3-33 0-37 3Z"/></g>`;
// Slender, unequal filigree clusters grow from the rim; open curls keep air between leaves.
const legendary = `<path class="rim-wire" stroke-width=".65" d="M-16 19C-25 14-33 6-36-1S-29-14-23-20C-19-24-15-28-11-29 M-31 8C-40 13-43 5-39 2C-36 0-34 4-37 5 M-26-17C-34-24-29-31-25-28C-22-26-25-24-26-26 M-12-28C-10-36-2-41 1-36C3-32-2-31-2-34 M21 15C28 12 33 5 32 0C31-4 28-5 27-2 M14 24C20 28 25 26 24 23C23 21 21 23 22 24"/>
<path class="rim-leaf" d="M-23 13C-30 15-36 14-38 10C-32 11-27 8-23 13Z M-34 2C-40-2-42-8-39-13C-39-6-34-5-34 2Z M-30-12C-35-14-36-19-34-23C-33-18-29-17-30-12Z M-20-23C-25-26-26-32-24-35C-23-30-18-28-20-23Z M-14-27C-12-33-8-36-4-35C-8-32-8-28-14-27Z M30 7C35 5 37 1 35-3C34 2 30 2 30 7Z M19 18C24 17 28 19 29 22C25 21 21 23 19 18Z"/>
<path class="rim-wire" stroke-width=".6" d="M-11-29  -8-32 -5-31 -8-28Z M15 22 17 19 20 20 18 23Z"/>`;
export function createRarityRim(rarity){
  if(rarity!=='rare'&&rarity!=='legendary')return null;
  const svg=new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-58 -58 116 116" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">${rarity==='rare'?rare:legendary}</svg>`,'image/svg+xml').documentElement;
  svg.classList.add('run-item-rarity-art');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');return svg;
}
