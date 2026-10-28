// Active Classic visual-shell contract; old third-person visual checks retired.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const html=readFileSync(new URL('../classic.html',import.meta.url),'utf8');
const world=readFileSync(new URL('../src/classic-prototype.js',import.meta.url),'utf8');
test('Classic is the sole public game entry in the development build',()=>{
 assert.ok(index.includes("location.replace('./classic.html'"));
 assert.ok(html.includes('id="classic-game"'));
 assert.ok(!index.includes('src/main.js'));
});
test('Classic loads its dedicated world, combat, HUD and style selector',()=>{
 assert.ok(world.includes("from './classic-village.js'"));
 assert.ok(world.includes("from './classic-combat.js'"));
 for(const path of ['classic-hud.css','classic.css','classic-integrated-ui.css'])assert.ok(html.includes('./src/'+path));
 for(const style of ['melee','magic','ranged'])assert.ok(html.includes('data-style="'+style+'"'));
});
