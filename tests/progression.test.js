import test from 'node:test';
import assert from 'node:assert/strict';
import { LOADOUTS, ARMOUR, STYLE_ORDER, xpToLevel, defaultSave, validSave, canEquipWeapon, canEquipArmour, skillCatalogue, equippedSkills, equipSkill, damageAfterArmour, outgoingMultiplier } from '../src/rules.js';
const toXp=n=>Array.from({length:n-1},(_,i)=>xpToLevel(i+1)).reduce((a,b)=>a+b,0);
test('new players start with a single active skill and a locked progression',()=>{
 const s=defaultSave();
 for(const style of STYLE_ORDER){assert.equal(equippedSkills(s,style,s.gear[style]).filter(Boolean).length,1);assert.equal(skillCatalogue(style,s.gear[style]).length,6);}
 assert.equal(canEquipWeapon('melee','daggers',s.xp),false);assert.equal(canEquipArmour('plate',s.xp),false);
});
test('skill levels unlock meaningful optional abilities without populating slots automatically',()=>{
 const s=defaultSave();const w=s.gear.melee;
 assert.equal(equipSkill(s,'melee',w,1,'s0'),false);
 s.xp.melee=toXp(2);
 assert.equal(equipSkill(s,'melee',w,1,'s0'),true);
 assert.equal(equippedSkills(s,'melee',w)[1].name,'Battle Rush');
 assert.equal(equipSkill(s,'melee',w,2,'w1'),false);
 s.xp.melee=toXp(3);
 assert.equal(equipSkill(s,'melee',w,2,'w1'),true);
 assert.equal(equippedSkills(s,'melee',w)[2].name,'Cleave');
});
test('skills can be rearranged without duplicated hotbar entries',()=>{
 const s=defaultSave();assert.equal(equipSkill(s,'magic','frost',3,'w0'),true);
 assert.equal(equippedSkills(s,'magic','frost')[0],null);
 assert.equal(equippedSkills(s,'magic','frost')[3].id,'w0');
 assert.equal(equipSkill(s,'magic','frost',3,null),true);
 assert.equal(equippedSkills(s,'magic','frost')[3],null);
});
test('higher quality weapons require the relevant style level, armour requires vitality',()=>{
 const s=defaultSave();s.xp.melee=toXp(6);
 assert.ok(canEquipWeapon('melee','forged_sword',s.xp));assert.ok(!canEquipWeapon('magic','runic_frost',s.xp));
 assert.ok(!canEquipArmour('leather',s.xp));s.xp.vitality=toXp(3);assert.ok(canEquipArmour('leather',s.xp));
 assert.ok(Object.values(ARMOUR).every(a=>a.mobility>0));
});
test('save migration sanitizes equipped weapon, armour, and locked or corrupted skills',()=>{
 const raw={xp:{melee:0,magic:0,ranged:0,vitality:0},gear:{melee:'forged_sword'},armour:{melee:'plate'},slots:{melee:{sword:['w3','w0','w0','s0']}}};
 const s=validSave(raw);assert.equal(s.gear.melee,'sword');assert.equal(s.armour.melee,'traveller');
 assert.deepEqual(s.slots.melee.sword,[null,'w0',null,null]);
 const old=validSave({xp:{melee:0}});assert.deepEqual(old.slots.melee.sword,['w0',null,null,null]);
});
test('armour changes actual physical damage and offers distinct mobility and power tradeoffs',()=>{
 assert.ok(damageAfterArmour(100,false,'plate')<damageAfterArmour(100,false,'leather'));
 assert.ok(damageAfterArmour(100,false,'traveller','magical')<damageAfterArmour(100,false,'plate','magical'));
 assert.ok(outgoingMultiplier('plate','melee')>outgoingMultiplier('plate','magic'));
});
