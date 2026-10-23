import test from 'node:test';
import assert from 'node:assert/strict';
import {awardMonsterVictory,combatSourceSnapshot} from '../src/gameplay-core.js';
import {defaultSave,validSave,LOADOUTS,STYLE_ORDER,XP_BY_MOB,xpToLevel,levelFromXp,outgoingMultiplier} from '../src/rules.js';
import {equipmentModifiers} from '../src/equipment-slots.js';
import {maxHitFor} from '../src/auto-combat.js';
import {storageKey} from '../src/storage-key.js';

test('all three styles retain their own monster XP while Vitality and kills update exactly once',()=>{
 for(const style of STYLE_ORDER){
  const save=defaultSave(),before={...save.xp};
  const result=awardMonsterVictory(save,'boar',style);
  assert.equal(result.awarded,true);
  assert.equal(result.style,style);
  assert.equal(save.xp[style],before[style]+XP_BY_MOB.boar);
  assert.equal(save.xp.vitality,before.vitality+Math.floor(XP_BY_MOB.boar*.55));
  for(const other of STYLE_ORDER.filter(x=>x!==style))assert.equal(save.xp[other],before[other]);
  assert.equal(save.defeated,1);
 }
});

test('dummy or unknown enemy never grants XP, vitality or quest credit',()=>{
 for(const type of ['dummy','unknown']){
  const save=defaultSave(),unchanged=JSON.stringify(save);
  assert.deepEqual(awardMonsterVictory(save,type,'magic'),{awarded:false});
  assert.equal(JSON.stringify(save),unchanged);
 }
});

test('style and vitality level-ups expose existing unlock names and eight HP per vitality level',()=>{
 const save=defaultSave();
 const beforeLevel2=xpToLevel(1);
 save.xp.melee=beforeLevel2-10;
 save.xp.vitality=beforeLevel2-10;
 const result=awardMonsterVictory(save,'mossling','melee');
 assert.equal(result.oldLevel,1);
 assert.equal(result.newLevel,2);
 assert.equal(result.oldVital,1);
 assert.equal(result.newVital,2);
 assert.equal(result.vitalityHealthBonus,8);
 assert.ok(result.unlocked.includes('Battle Rush'));
 assert.equal(levelFromXp(save.xp.melee).level,2);
 assert.equal(levelFromXp(save.xp.vitality).level,2);
});

test('third valid kill signals the original first challenge once, but no quest state is invented',()=>{
 const save=defaultSave();
 for(let i=0;i<3;i++){
  const result=awardMonsterVictory(save,'mossling','ranged');
  assert.equal(result.firstChallengeReached,i===2);
 }
 assert.equal(save.defeated,3);
 assert.equal(awardMonsterVictory(save,'mossling','ranged').firstChallengeReached,false);
});

test('combat snapshots match existing Melee/Magic/Ranged calculation without mutating saves',()=>{
 const save=defaultSave();
 const untouched=JSON.stringify(save);
 for(const style of STYLE_ORDER){
  const weapon=LOADOUTS[style][save.gear[style]];
  const source=combatSourceSnapshot(save,style,weapon);
  const level=levelFromXp(save.xp[style]).level;
  const power=outgoingMultiplier(save.armour[style],style)*equipmentModifiers(save,style).power;
  assert.deepEqual(source,{style,level,power,weaponBasic:weapon.basic,maxHit:maxHitFor(level,weapon.basic,power)});
 }
 assert.equal(JSON.stringify(save),untouched);
});

test('save and dev/public namespaces survive the gameplay extraction unchanged',()=>{
 const original=defaultSave();
 original.coins=217;original.xp.melee=937;original.xp.magic=158;
 original.inventory.materials['moss-fibre']=3;
 original.bank.coins=48;
 original.equipment.melee.helm='recruit-helm';
 original.slots.melee.sword=['w0',null,null,null];
 const saved=JSON.stringify(original);
 // This block may not change the serialized save payload or existing keys.
 assert.equal(saved,JSON.stringify(original));
 const restored=validSave(JSON.parse(saved));
 assert.equal(restored.coins,217);
 assert.equal(restored.xp.melee,937);
 assert.equal(restored.xp.magic,158);
 assert.equal(restored.inventory.materials['moss-fibre'],3);
 assert.equal(restored.bank.coins,48);
 assert.equal(storageKey('oakrest-v1','/oakrest/'),'oakrest-v1');
 assert.equal(storageKey('oakrest-v1','/oakrest-dev/'),'oakrest-dev-v1');
});
