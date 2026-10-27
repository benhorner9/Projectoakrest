// Classic replaces the retired third-person touch action arc.
// Browser-level gesture, combat and quick-slot tests are in browser-classic-*.cjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../classic.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../src/classic-prototype.js',import.meta.url),'utf8');
test('Classic provides the native touch joystick and combat actions',()=>{
 for(const id of ['classic-joystick','classic-attack','classic-ability-buttons','classic-dodge','classic-item-window'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const style of ['melee','magic','ranged'])assert.ok(html.includes('data-style="'+style+'"'),style);
});
test('Classic touch and camera use the actual gameplay client',()=>{
 assert.ok(source.includes("from './classic-canvas-input.js'"));
 assert.ok(source.includes("from './classic-camera-controls.js'"));
 assert.ok(source.includes("from './classic-touch-press.js'"));
});
