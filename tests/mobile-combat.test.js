import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/mobile-combat.css',import.meta.url),'utf8');
test('touch layout reuses existing four skill buttons and includes major actions',()=>{
 for(const id of ['touch-skill-dock','touch-action-pad','touch-attack','touch-swap','touch-dodge','joystick'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('mobile-combat.css'));
 assert.ok(main.includes("if(isTouch) $('touch-skill-dock').appendChild($('skills'))"));
});
test('skill arc includes four abilities, attack, swap and dodge',()=>{
 for(let i=1;i<=4;i++)assert.ok(css.includes('.skill:nth-child('+i+')'));
 for(const id of ['touch-attack','touch-swap','touch-dodge'])assert.ok(css.includes('#'+id));
 assert.ok(css.includes('pointer-events:auto'));
});
test('style swap updates its next-style label without removing existing ability handlers',()=>{
 assert.ok(main.includes("swap.querySelector('small').textContent=upcoming.toUpperCase()"));
 assert.ok(main.includes("b.addEventListener('pointerdown'"));assert.ok(main.includes("if(now()-touchAt>.35)"));
});
