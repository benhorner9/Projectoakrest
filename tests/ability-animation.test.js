import test from 'node:test';
import assert from 'node:assert/strict';
import {LOADOUTS,SHARED_ABILITIES,STYLE_ORDER,skillCatalogue} from '../src/rules.js';
import {abilityMotion} from '../src/animation-language.js';
import {abilityAnimationSpec,basicAnimationSpec,listAnimationSpecs,createAnimationEventJournal} from '../src/ability-animation.js';

test('each base weapon family has a basic attack and every weapon/shared skill specified',()=>{
 const matrix=listAnimationSpecs();
 assert.equal(matrix.length,56,'8 weapon families × (1 basic + 4 weapon abilities + 2 shared)');
 assert.equal(matrix.filter(a=>a.style==='melee').length,21);
 assert.equal(matrix.filter(a=>a.style==='ranged').length,21);
 assert.equal(matrix.filter(a=>a.style==='magic').length,14);
 for(const style of STYLE_ORDER)for(const [weaponId,weapon] of Object.entries(LOADOUTS[style])){
  const family=weapon.family;
  const basic=basicAnimationSpec(style,weaponId);
  assert.ok(basic,style+':'+weaponId+' basic');
  assert.equal(basic.anticipation.seconds,Math.min(weapon.interval*.7,weapon.windup||weapon.interval*.25));
  assert.equal(basic.recovery.seconds,weapon.interval,'cadence must not be rewritten by animation');
  for(const ability of skillCatalogue(style,weaponId)){
   const s=abilityAnimationSpec(style,weaponId,ability);
   assert.ok(s,style+'/'+weaponId+'/'+ability.id);
   assert.equal(s.weaponFamily,family);
   for(const field of ['id','startingPose','tell','release','event','eventAt','hitOrigin','followThrough','interruption','vfx','audio','fallback'])
    assert.ok(typeof s[field]==='string'&&s[field].length>4,s.id+': '+field);
   assert.ok(Number.isFinite(s.anticipation.seconds)&&s.anticipation.seconds>=0);
   assert.ok(s.recovery.seconds>=s.anticipation.seconds);
   assert.equal(Object.isFrozen(s),true);
  }
 }
});

test('weapon-family ability cues remain unique and readable even with effects turned off',()=>{
 const matrix=listAnimationSpecs();
 for(const family of ['sword','daggers','greatsword','bow','shortbow','crossbow','frost','ember']){
  const rows=matrix.filter(s=>s.weaponFamily===family);
  assert.equal(rows.length,7,family);
  const cues=rows.map(s=>s.motionCue);
  assert.equal(new Set(cues).size,7,family+' must not reuse the same body tell');
  for(const r of rows){
   const pose=abilityMotion(family,r.motionCue,.8,.1);
   assert.ok(Object.values(pose).every(x=>Number.isFinite(x)&&Math.abs(x)<=1.35),r.id);
  }
  // Distinctive wind-up must be expressed by the actual rig, not merely VFX text.
  const poses=rows.slice(1).map(s=>JSON.stringify(abilityMotion(family,s.motionCue,.85,.1)));
  assert.equal(new Set(poses).size,6,family+' abilities must have distinct pose signatures');
 }
});

test('binding, snaring, shielding and AoE actions communicate distinct mechanics',()=>{
 const get=(id)=>listAnimationSpecs().find(s=>s.id===id);
 for(const [root,ordinary] of [['frost:w2','frost:w0'],['bow:w2','bow:w0'],['crossbow:w2','crossbow:w0'],['frost:w3','frost:w1'],['ember:w1','ember:w0']]){
  const a=get(root),b=get(ordinary);
  assert.notEqual(a.motionCue,b.motionCue);
  assert.notDeepEqual(abilityMotion(a.weaponFamily,a.motionCue,.8,.2),abilityMotion(b.weaponFamily,b.motionCue,.8,.2));
 }
 assert.match(get('frost:w2').tell,/fist/i);
 assert.match(get('frost:w1').tell,/outward/i);
 assert.match(get('frost:w3').tell,/forearms/i);
});

test('instant gameplay actions are not misrepresented as pre-hit telegraphs',()=>{
 for(const row of listAnimationSpecs().filter(r=>r.instant)){
  assert.equal(row.anticipation.seconds,0);
  assert.match(row.warning,/no pre-effect/i);
  assert.equal(row.event,'ability_effect');
 }
 for(const row of listAnimationSpecs().filter(r=>r.abilityId==='basic'))assert.equal(row.instant,false);
});

test('event journal records bounded, at-most-once release and combat windows per action',()=>{
 const journal=createAnimationEventJournal(8);
 const id=journal.begin({specId:'bow:w0',style:'ranged',family:'bow',at:100});
 assert.equal(journal.record(id,'release',100.5),true);
 assert.equal(journal.record(id,'release',100.5),false,'render loops must not duplicate release');
 assert.equal(journal.record(id,'projectile_spawn',100.5),true);
 assert.equal(journal.record(id,'recovery_end',101),true);
 const other=journal.begin({specId:'daggers:w1',style:'melee',family:'daggers',at:102});
 for(const kind of ['release','contact_window_start','contact_window_start_2','contact_window_end','contact_window_end_2'])
  assert.equal(journal.record(other,kind,102.1),true);
 const rows=journal.latest();
 assert.equal(rows.length,8,'bounded journal ring buffer');
 assert.ok(rows.every(row=>row.actionId&&Number.isFinite(row.at)&&row.eventId));
 rows[0].event='tampered';
 assert.notEqual(journal.latest()[0].event,'tampered','snapshot is not mutable journal');
 assert.equal(journal.record('', 'release',103),false);
 assert.equal(journal.record(other,'release',Number.NaN),false);
});

test('ability specifications never replace weapon family combat rules',()=>{
 for(const [style,weapons] of Object.entries(LOADOUTS)){
  for(const [weaponId,w] of Object.entries(weapons)){
   const s=basicAnimationSpec(style,weaponId);
   assert.equal(s.recovery.seconds,w.interval);
   assert.equal(s.event,style==='melee'?'contact_window_start':'projectile_spawn');
  }
 }
 for(const style of STYLE_ORDER)assert.equal(SHARED_ABILITIES[style].length,2);
});
