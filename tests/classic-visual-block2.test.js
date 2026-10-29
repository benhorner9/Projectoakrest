import test from 'node:test';
import assert from 'node:assert/strict';
import {classicVisualItem,classicVisualLoadout,classicVisualWeaponFamily,classicGarmentSilhouette,CLASSIC_VISUAL_TIERS} from '../src/classic-avatar-art.js';
import {classicBodyMotion} from '../src/classic-sprite-rig.js';
import {safeAppearance} from '../src/characters.js';
import {presentationSnapshot} from '../src/classic-presentation.js';
import {freshCharacterSave} from '../src/rules.js';

test('authentic gear material art is driven by worn item IDs, never the combat-style button',()=>{
 const bare=classicVisualLoadout({});
 assert.ok(Object.values(bare).every(x=>x===null),'naked characters must not invent equipment');
 assert.equal(classicGarmentSilhouette({}),'starter');
 assert.equal(classicVisualWeaponFamily('none'),'none');
 assert.equal(classicVisualWeaponFamily(null),'none');
 for(const [id,family] of [['sword','sword'],['greatsword','greatsword'],
  ['daggers','daggers'],['bronze-axe','axe'],['bow','bow'],['crossbow','crossbow'],
  ['frost','staff'],['oak-wand','wand']]){
  assert.equal(classicVisualWeaponFamily(id),family);
 }
 for(const [id,shape] of [['starter-mail','armoured'],['starter-leather','fitted'],
  ['starter-robes','robed'],['none','starter']])
  assert.equal(classicGarmentSilhouette({chest:id}),shape);
 const w=classicVisualLoadout({helm:'recruit-helm',chest:'starter-mail',
  legs:'recruit-greaves',boots:'recruit-boots',weapon:'sword',offhand:'recruit-shield'});
 assert.equal(w.chest.material,'metal');
 assert.equal(w.offhand.material,'metal');
 assert.equal(w.helm.id,'recruit-helm');
 assert.equal(w.arrows,null);
});
test('all approved material tiers visibly differ and are stable across loads',()=>{
 const colors=new Set();
 for(const tier of CLASSIC_VISUAL_TIERS){
  const sword=classicVisualItem(tier.name+'-sword','weapon');
  const mail=classicVisualItem(tier.name+'-mail','chest');
  assert.equal(sword.tier,tier.name);
  assert.equal(mail.tier,tier.name);
  assert.equal(sword.base,mail.base);
  colors.add(sword.base);
 }
 assert.equal(colors.size,CLASSIC_VISUAL_TIERS.length,'no two tier bases can become visually identical');
 assert.notDeepEqual(classicVisualItem('scout-hood','helm'),classicVisualItem('apprentice-hood','helm'));
});
test('new visual poses stay finite, bounded and preserve old grip handling',()=>{
 for(const pose of ['idle','prepare','windup','swing','strike','follow','recover',
  'work-raise','work-contact','work-recover']){
  for(const step of [0,1,2]){
   const motion=classicBodyMotion(pose,step);
   assert.ok(Number.isInteger(motion.x)&&Number.isInteger(motion.y));
   assert.ok(Math.abs(motion.x)<=2&&Math.abs(motion.y)<=2);
  }
 }
 assert.notDeepEqual(classicBodyMotion('windup',0),classicBodyMotion('strike',0));
 assert.notDeepEqual(classicBodyMotion('idle',1),classicBodyMotion('idle',2));
});
test('creator choices and save representation remain byte-compatible; empty loadouts stay visually empty',()=>{
 const prior=safeAppearance({sex:'female',hairstyle:'ponytail',hairColor:'#765037',
  skinTone:'#aa7153',outfit:'scholar',outfitColor:'#4d745a'});
 assert.deepEqual(safeAppearance(prior),prior);
 const state=freshCharacterSave(),save=JSON.stringify(state);
 for(const style of ['melee','ranged','magic']){
  const p=presentationSnapshot(state,style,{x:0,z:39});
  assert.equal(p.worn.weapon,'none');
  assert.equal(classicVisualWeaponFamily(p.worn.weapon),'none');
  assert.equal(classicGarmentSilhouette(p.worn),'starter');
  assert.ok(Object.values(classicVisualLoadout(p.worn)).every(x=>x===null));
 }
 assert.equal(JSON.stringify(state),save,'art never mutates saved progress');
});
