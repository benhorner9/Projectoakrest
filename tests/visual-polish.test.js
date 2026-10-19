import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const src=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
const visual=readFileSync(new URL('../src/visual-world.js',import.meta.url),'utf8');
const combat=readFileSync(new URL('../src/combat-visuals.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/visual-polish.css',import.meta.url),'utf8');
test('visual polish stylesheet is loaded after core and mobile styles',()=>{
 assert.ok(html.indexOf('src/visual-polish.css')>html.indexOf('src/progression.css'));
 for(const part of ['.combatbar','.vitals','.quest','.progression-card','.touch-enabled .joystick','.touch-enabled .touch-actions #touch-attack','.overlay .panel'])assert.ok(css.includes(part),part);
});
test('new scenery and character details hook into running scene',()=>{
 assert.ok(src.includes('const scenery=createOakrestScenery({THREE,scene,random,MAT})'));
 assert.ok(src.includes('scenery.update(t,camera)'));
 assert.ok(src.includes('const costume=enrichHero('));
 assert.ok(src.includes('enrichEnemy({THREE,type,g,block,ball,mat,MAT})'));
 for(const key of ['InstancedMesh','vegetable','dome','lantern','cart','crate','enrichHero','enrichEnemy'])assert.ok(key==='vegetable'?visual.includes('Small vegetable beds'):visual.includes(key),key);
});
test('hit and attack VFX have teardown paths to avoid resource leaks',()=>{
 assert.ok(combat.includes('fx.mesh.geometry.dispose()'));
 assert.ok(combat.includes('fx.mesh.material.dispose()'));
 assert.ok(combat.includes('mesh.geometry?.dispose()'));
 assert.ok(src.includes('visuals.impact('));
 assert.ok(src.includes('visuals.arc('));
 assert.ok(src.includes('visuals.projectile('));
 assert.ok(src.includes('visuals.cleanupProjectile(p.mesh)'));
});
test('intro version and interface retain the four main character menu options',()=>{
 assert.ok(html.includes('THE GREENWOOD FRONTIER'));
 for(const name of ['EQUIP','INVENTORY','SKILLS','ABILITIES'])assert.ok(html.includes('>'+name+'</button>'));
});
