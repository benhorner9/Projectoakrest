import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createClassicCombat} from '../src/classic-combat.js';
import {defaultSave,skillCatalogue} from '../src/rules.js';
import {classicAbilityProfile} from '../src/classic-ability-profiles.js';
import {createClassicAbilityView} from '../src/classic-ability-view.js';
const p={x:-1,z:71.3};
const advance=(g,p,s)=>{const e=[];for(let i=0;i<Math.round(s*60);i++)e.push(...g.tick(1/60,p));return e;};
function verify(style,weapon,id,name){
 const save=defaultSave();save.xp[style]=100000;save.inventory.weapons[style]=[weapon];save.gear[style]=weapon;
 save.slots[style][weapon]=[id,null,null,null];save.inventory.materials={'field-arrows':100,'frost-scroll':100,'ember-scroll':100};
 const ability=skillCatalogue(style,weapon).find(a=>a.id===id);
 const make=()=>{const g=createClassicCombat({save,adventure:true,random:()=>.2,monsterDefinitions:[{id:'target',type:'dummy',x:-1,z:73,maxHp:10000},{id:'hurt',type:'mossling',x:10,z:87,maxHp:1000}]});g.styleSwitch(style);advance(g,p,.2);return g;};
 const prepare=g=>{if(ability.kind==='heal'){advance(g,{x:10,z:89},2);assert.ok(g.getState().hp<g.getState().maxHp);}else g.chooseTarget('target',p);assert.equal(g.queueAbility(0,p),true);};
 const g=make();prepare(g);assert.equal(g.getState().action.name,name);
 const cooldown=g.getState().abilities[0].cooldownEnd;
 const scene=new THREE.Scene(),view=createClassicAbilityView(scene);
 view.update(g.getState(),p);assert.equal(view.stats().visible,true,'visible individual preparation');
 const events=advance(g,p,.9),release=events.find(e=>e.type==='release'&&e.name===name);assert.ok(release);
 if(['dash','dashback'].includes(ability.kind))assert.ok(events.some(e=>e.type==='dash'&&Math.abs(e.distance)===ability.distance));
 else if(ability.kind==='heal')assert.ok(events.some(e=>e.type==='heal'&&e.amount>0));
 else {assert.ok(events.some(e=>e.type==='hit'&&e.abilityId===id));
  const target=g.getState().monsters[0];for(const key of ['root','slow','stun','bleed'])if(ability[key])assert.ok(target[key+'Until']>0,key);}
 assert.equal(g.getState().abilities[0].cooldownEnd,cooldown);
 const material=style==='ranged'?'field-arrows':weapon==='ember'?'ember-scroll':'frost-scroll';
 const expected=style==='melee'||['dash','dashback'].includes(ability.kind)&&style==='ranged'?0:ability.kind==='burst'?3:1;
 assert.equal(g.persistentSave().inventory.materials[material],100-expected);
 view.update({...g.getState(),action:null,lastRelease:{...release},time:release.time+.02},p);assert.equal(view.stats().visible,true);
 view.dispose();assert.equal(scene.children.length,0);
 const cancelled=make();prepare(cancelled);cancelled.stopTarget();
 assert.equal(advance(cancelled,p,.9).some(e=>['release','projectile','heal','dash'].includes(e.type)),false);
 assert.equal(cancelled.persistentSave().inventory.materials[material],100);
 assert.equal(cancelled.getState().abilities[0].cooldownEnd,cooldown);
 assert.deepEqual(cancelled.persistentSave().slots[style][weapon],[id,null,null,null]);
 assert.ok(classicAbilityProfile(name));
}

test('Cleave'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','sword','w1','Cleave'));

test('Guard Break'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','sword','w2','Guard Break'));

test('Quick Slice'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','daggers','w0','Quick Slice'));

test('Twin Strike'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','daggers','w1','Twin Strike'));

test('Shadow Step'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','daggers','w2','Shadow Step'));

test('Open Wound'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','daggers','w3','Open Wound'));

test('Battle Rush'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','sword','s0','Battle Rush'));

test('Second Wind'+" releases its intended effect, pays once, and cancels safely",()=>verify('melee','sword','s1','Second Wind'));

test('Rapid Shot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','bow','w1','Rapid Shot'));

test('Pinning Shot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','bow','w2','Pinning Shot'));

test('Retreating Shot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','bow','w3','Retreating Shot'));

test('Crack Shot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','crossbow','w0','Crack Shot'));

test('Scattershot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','crossbow','w1','Scattershot'));

test('Snare Bolt'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','crossbow','w2','Snare Bolt'));

test('Roll Back'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','crossbow','w3','Roll Back'));

test('Evasive Roll'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','bow','s0','Evasive Roll'));

test('Focus Shot'+" releases its intended effect, pays once, and cancels safely",()=>verify('ranged','bow','s1','Focus Shot'));

test('Frost Nova'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','frost','w1','Frost Nova'));

test('Frozen Binding'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','frost','w2','Frozen Binding'));

test('Firebolt'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','ember','w0','Firebolt'));

test('Flame Wave'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','ember','w1','Flame Wave'));

test('Blink'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','ember','w2','Blink'));

test('Arcane Bolt'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','frost','s0','Arcane Bolt'));

test('Phase Step'+" releases its intended effect, pays once, and cancels safely",()=>verify('magic','frost','s1','Phase Step'));

test('Rapid Shot has three distinct contact times, one committed cost and no duplicate volley after retreat',()=>{
 const save=defaultSave();save.xp.ranged=100000;save.slots.ranged.bow=['w1',null,null,null];save.inventory.materials={'field-arrows':10};
 const g=createClassicCombat({save,adventure:true,random:()=>.2,monsterDefinitions:[{id:'target',type:'dummy',x:-1,z:73,maxHp:10000}]});
 const far={x:-1,z:66};g.styleSwitch('ranged');advance(g,far,.2);g.chooseTarget('target',far);g.queueAbility(0,far);
 advance(g,far,.45);g.stopTarget();const events=advance(g,far,1);
 const hits=events.filter(e=>e.type==='hit');assert.equal(hits.length,3);assert.equal(new Set(hits.map(e=>e.time)).size,3);
 assert.equal(g.persistentSave().inventory.materials['field-arrows'],7);assert.equal(events.some(e=>e.type==='release'),false);
});
