import test from 'node:test';
import assert from 'node:assert/strict';
import {abilitySoundProfile} from '../src/ability-audio.js';
import {createAudio} from '../src/audio.js';

test('signature cues distinguish weapon families, magic school and skill types',()=>{
 const sword=abilitySoundProfile('melee','hit','sword');
 const greatsword=abilitySoundProfile('melee','hit','greatsword');
 const daggers=abilitySoundProfile('melee','hit','daggers');
 const frost=abilitySoundProfile('magic','bolt','frost');
 const ember=abilitySoundProfile('magic','bolt','ember');
 assert.notEqual(sword.hz,greatsword.hz);
 assert.notEqual(sword.hz,daggers.hz);
 assert.notDeepEqual(frost,ember);
 for(const [style,a,b,family] of [
  ['melee','sweep','execute','sword'],
  ['magic','heal','nova','frost'],
  ['ranged','burst','retreat','bow'],
  ['melee','hit','shield','daggers']
 ])assert.notDeepEqual(abilitySoundProfile(style,a,family),abilitySoundProfile(style,b,family));
});

test('sound envelopes are strictly bounded and Safari-safe',()=>{
 for(const style of ['melee','ranged','magic'])
  for(const kind of ['hit','execute','sweep','nova','bolt','burst','shield','heal','dash','dashback','retreat'])
   for(const family of ['sword','daggers','greatsword','bow','crossbow','frost','ember']){
    const sound=abilitySoundProfile(style,kind,family);
    assert.ok(['sine','triangle','sawtooth','square'].includes(sound.wave));
    assert.ok(sound.hz>0&&sound.hz*sound.sweep>0);
    assert.ok(sound.seconds>=.1&&sound.seconds<.5);
    assert.ok(sound.gain>0&&sound.gain<.08);
   }
});

test('mute settings and the browser audio gesture gate are respected',()=>{
 const originalWindow=globalThis.window;
 const notes=[],voices=[];
 class FakeAudioContext{
  state='running';currentTime=0;
  resume(){return Promise.resolve();}
  createOscillator(){
   const o={type:'',frequency:{
    setValueAtTime(v){notes.push(['start',v]);},
    exponentialRampToValueAtTime(v){notes.push(['end',v]);}
   },connect(){},disconnect(){},start(){voices.push('start');},stop(){voices.push('stop');},onended:null};
   return o;
  }
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  destination={};
 }
 try{
  globalThis.window={AudioContext:FakeAudioContext};
  const sound=createAudio(null);
  sound.playAbility('magic','nova','frost');
  assert.equal(voices.length,0,'locked audio should remain silent until a user gesture');
  sound.unlock();
  sound.setEnabled(false);sound.playAbility('magic','nova','frost');
  assert.equal(voices.length,0,'muted users must hear nothing');
  sound.setEnabled(true);sound.setVolume(0);sound.playAbility('melee','sweep','sword');
  assert.equal(voices.length,0,'zero volume must remain silent');
  sound.setVolume(.6);sound.playAbility('magic','nova','frost');
  assert.deepEqual(voices,['start','stop']);
  assert.ok(notes.length>=2);
 }finally{if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;}
});
