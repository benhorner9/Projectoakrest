import test from 'node:test';
import assert from 'node:assert/strict';
import {createCharacter,readCharacters,safeAppearance,normaliseCharacterName,CHARACTER_LIMIT} from '../src/characters.js';
import {freshCharacterSave,validSave,defaultSave,defenceFor,ownsArmour,ownsWeapon} from '../src/rules.js';
import {createActor,equipActor,applyCharacterAppearance} from '../src/actors.js';

const id='d97c8f50-eeb3-4ef6-92ef-1652910478b4';
test('creator accepts a safe name and controlled appearance only',()=>{
 const c=createCharacter({name:'  River   Stone ',sex:'female',hairstyle:'long',hairColor:'#a75539',skinTone:'#7b503d',outfit:'scholar',outfitColor:'#626392'},[],id);
 assert.equal(c.name,'River Stone');assert.equal(c.sex,'female');assert.equal(c.hairstyle,'long');
 assert.equal(normaliseCharacterName('<script>'),'');
 assert.equal(normaliseCharacterName('A'),'');
 assert.equal(safeAppearance({hairstyle:'malicious'}).hairstyle,'short');
 assert.throws(()=>createCharacter({name:'RIVER STONE'},[c],id));
});
test('character roster discards malformed, duplicate and oversized entries',()=>{
 const a=createCharacter({name:'Forest One'},[],id);
 const b={...a,name:'Forest Two',id:'8bea989d-7ec6-49a7-9894-1647eeec28e4'};
 const store={getItem:()=>JSON.stringify([a,a,b,{...b,name:'FOREST ONE'},null,{...a,id:'illegal'}])};
 assert.deepEqual(readCharacters(store,'test'),[a,b]);
 assert.equal(CHARACTER_LIMIT,3);
});
test('new characters begin with no inventory, equipment or combat XP',()=>{
 const s=freshCharacterSave();
 assert.deepEqual(s.inventory.weapons,{melee:[],magic:[],ranged:[]});
 assert.deepEqual(s.inventory.armour,[]);
 assert.deepEqual(s.armour,{melee:'none',magic:'none',ranged:'none'});
 assert.equal(s.xp.melee,0);assert.equal(s.coins,0);assert.equal(ownsWeapon(s,'melee','sword'),false);assert.equal(ownsArmour(s,'traveller'),false);
 assert.equal(defenceFor(s.armour.melee).physical,0);
 const restored=validSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored,s);
 assert.deepEqual(defaultSave().inventory.weapons.melee,['sword'],'legacy starter loadout stays unchanged');
});
test('changing appearance never affects another actor or equipment progression',()=>{
 const first=createActor(),second=createActor();
 equipActor(first,'melee','sword','none');equipActor(second,'melee','sword','none');
 applyCharacterAppearance(first,{sex:'female',hairstyle:'ponytail',hairColor:'#a75539',skinTone:'#51392d',outfit:'traveller',outfitColor:'#626392'});
 assert.equal(first.userData.hairTail.visible,true);
 assert.equal(second.userData.hairTail.visible,false);
 assert.notEqual(first.userData.skinMaterial.color.getHex(),second.userData.skinMaterial.color.getHex());
 assert.equal(first.userData.chestPlate.visible,false);
 assert.equal(first.userData.outfitTrims.filter(o=>o.visible).length,2);
});
