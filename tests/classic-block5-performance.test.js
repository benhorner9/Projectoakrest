import test from 'node:test';
import assert from 'node:assert/strict';
import {createClassicFrameBudget,classicAdaptiveRatio} from '../src/classic-frame-budget.js';
import {classicPixelRatio} from '../src/classic-art-direction.js';
import {createClassicAudioGate} from '../src/classic-audio-gate.js';
import {createAudio} from '../src/audio.js';
import {defaultSave} from '../src/rules.js';
import {createClassicSaveManager} from '../src/classic-save-manager.js';

test('Block 5: iPad pixel density adapts to sustained frame load without ever speeding combat',()=>{
 const g=createClassicFrameBudget();
 const base=classicPixelRatio(1194,834,2);
 assert.ok(base<=1.5);
 for(let i=0;i<100;i++)g.sample(16.6);
 assert.equal(g.scale,1,'normal 60fps frames never reduce resolution');
 for(let i=0;i<68;i++)g.sample(33.3);
 assert.ok(g.scale<1,'sustained sub-45fps rendering reduces resolution');
 const smaller=classicAdaptiveRatio(base,g.scale);
 assert.ok(smaller<base&&smaller>=.5);
 const reduced=g.scale;
 for(let i=0;i<10;i++)g.sample(16);
 assert.equal(g.scale,reduced,'brief good periods never cause shimmering DPR changes');
 for(let i=0;i<500;i++)g.sample(16.6);
 assert.ok(g.scale>reduced&&g.scale<=1,'stably fast iPad progressively regains resolution');
 for(let i=0;i<1000;i++)g.sample(33.3);
 assert.ok(g.scale>=.62,'bounded quality floor');
 const before=g.scale;
 for(let i=0;i<5;i++)g.sample(1100);
 assert.equal(g.scale,before,'background tab suspension is not interpreted as GPU overload');
 assert.ok(Number.isFinite(classicAdaptiveRatio(NaN,NaN)));
});

test('Block 5: audio gate bounds simultaneous burst cues and resets cleanly',()=>{
 const gate=createClassicAudioGate();
 assert.equal(gate.admit('hurt',10),true);
 assert.equal(gate.admit('hurt',10.03),false);
 assert.equal(gate.admit('hurt',10.12),true);
 assert.equal(gate.admit('warning',10),true);
 assert.equal(gate.admit('warning',10.15),false);
 assert.equal(gate.admit('warning',10.4),true);
 assert.equal(gate.admit('ability:magic:burst',10),true);
 assert.equal(gate.admit('ability:magic:burst',10.01),false);
 assert.equal(gate.admit('ability:ranged:burst',10.01),true);
 assert.equal(gate.admit('loot',NaN),false);
 gate.reset();
 assert.equal(gate.admit('hurt',10.01),true);
});

test('Block 5: muting, volume input and disabled WebAudio do not write repeatedly',()=>{
 const writes=[],storage={getItem:()=>null,setItem:(k,v)=>writes.push([k,v])};
 const audio=createAudio(storage,'test-audio');
 audio.setVolume(.6);
 audio.setEnabled(true);
 assert.equal(writes.length,0);
 audio.setVolume('bad');
 assert.equal(audio.volume,.6);
 audio.setVolume('.4');audio.setEnabled(false);
 assert.equal(writes.length,2);
 assert.equal(audio.enabled,false);assert.equal(audio.volume,.4);
 assert.deepEqual(JSON.parse(writes.at(-1)[1]),{enabled:false,volume:.4});
 // With audio disabled, unlock never tries to access window's WebAudio API.
 audio.unlock();
 audio.play('hurt');audio.playAbility('melee','hit','sword');
});

const ID='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const path='/oakrest-dev/classic.html';
function fixture(){
 const data=new Map(),prefix='oakrest-dev-',initial=JSON.stringify(defaultSave());
 data.set(prefix+'characters-v1',JSON.stringify([{id:ID,name:'Block 5 QA'}]));
 data.set(prefix+'active-character',ID);
 const key=prefix+'character-save-'+ID;
 data.set(key,initial);
 let onWrite=()=>{};
 const storage={
  getItem:k=>data.has(k)?data.get(k):null,
  setItem(k,v){onWrite(k,v);data.set(k,String(v));},
  removeItem:k=>data.delete(k)
 };
 const manager=createClassicSaveManager({storage,pathname:path,
  profile:{id:ID,name:'Block 5 QA'},baselineRaw:initial});
 return {data,storage,manager,key,initial,setOnWrite:fn=>onWrite=fn};
}
test('Block 5: each successful save has a separately verified previous checkpoint',()=>{
 const f=fixture(),m=f.manager;
 assert.equal(m.status().canRestore,false);
 assert.equal(m.enable().ok,true);
 assert.equal(m.save({...defaultSave(),coins:13}).ok,true);
 assert.equal(f.data.get(m.status().checkpointKey),f.initial);
 assert.equal(m.status().canRestore,true);
 const first=f.data.get(f.key);
 assert.equal(m.save({...defaultSave(),coins:42}).ok,true);
 assert.equal(f.data.get(m.status().checkpointKey),first);
 assert.equal(JSON.parse(f.data.get(f.key)).coins,42);
 assert.equal(f.data.get(m.status().backupKey),f.initial,'original rollback remains untouched');
 assert.equal(m.restorePrevious().ok,true);
 assert.equal(f.data.get(f.key),first);
 assert.equal(m.status().enabled,false,'a restore never restarts saving in the old simulation');
 assert.equal(m.status().canRestore,false,'restored content matches checkpoint');
});

test('Block 5: concurrent changes cannot be overwritten by a restore',()=>{
 const f=fixture(),m=f.manager;
 assert.equal(m.enable().ok,true);
 assert.equal(m.save({...defaultSave(),coins:23}).ok,true);
 const foreign=JSON.stringify({...defaultSave(),coins:99});
 f.storage.setItem(f.key,foreign);
 assert.equal(m.restorePrevious().ok,false);
 assert.equal(f.data.get(f.key),foreign);
 assert.equal(f.data.get(m.status().backupKey),f.initial);
});

test('Block 5: a checkpoint write failure blocks saving before touching the character',()=>{
 const f=fixture(),m=f.manager;
 assert.equal(m.enable().ok,true);
 f.setOnWrite(k=>{if(k.includes('classic-checkpoint'))throw Error('quota');});
 assert.equal(m.save({...defaultSave(),coins:123}).ok,false);
 assert.equal(f.data.get(f.key),f.initial);
 assert.equal(m.status().enabled,false);
 assert.ok(m.status().blocked);
});
