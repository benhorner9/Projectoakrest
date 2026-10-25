import test from 'node:test';
import assert from 'node:assert/strict';
import {freshCharacterSave,validSave} from '../src/rules.js';
import {createAdventure} from '../src/adventure-state.js';
import {RECIPES} from '../src/adventure-content.js';
import {getItem} from '../src/items.js';
test('woodland tonic is a real inventory item and backpack craft, never a placeholder icon',()=>{
 const recipe=RECIPES.find(r=>r.id==='tonic');
 assert.ok(recipe);assert.equal(recipe.station,'inventory');assert.equal(recipe.profession,'cooking');
 assert.equal(recipe.result.material,'woodland-tonic');assert.ok(getItem('material.woodland-tonic'));
 const save=freshCharacterSave();save.inventory.materials['woodland-tonic']=3;
 assert.equal(validSave(save).inventory.materials['woodland-tonic'],3,'tonics survive save round-trip');
});
test('drinking consumes one owned tonic, heals through core combat callback and respects 12s cooldown',()=>{
 const save=freshCharacterSave();save.inventory.materials['woodland-tonic']=3;
 let hp=41;const events=[];
 const adventure=createAdventure(save,{
  emit:(type,props)=>events.push({type,...props}),
  heal:amount=>{const next=Math.min(100,hp+amount),changed=next>hp;hp=next;return changed;},
  grantWeapon:()=>{},resetDungeon:()=>{},calmGuardian:()=>{},sight:()=>true,random:()=>.2
 });
 const act=time=>adventure.action('drink',{time,player:{x:0,z:39}});
 assert.equal(act(1).ok,true);assert.equal(hp,61);
 assert.equal(save.inventory.materials['woodland-tonic'],2);
 assert.equal(act(1.5).ok,false,'cooldown blocks duplicate consumption');
 assert.equal(save.inventory.materials['woodland-tonic'],2);
 assert.equal(act(13).ok,true);assert.equal(hp,81);
 assert.ok(events.some(e=>e.reason?.includes('Drank woodland tonic')));
 hp=100;assert.equal(act(26).ok,false,'full health does not waste a tonic');
 assert.equal(save.inventory.materials['woodland-tonic'],1);
});
