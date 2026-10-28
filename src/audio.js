import {abilitySoundProfile} from './ability-audio.js';
import {createClassicAudioGate} from './classic-audio-gate.js';
/** Original bounded procedural cues. Settings persist per game environment. */
export function createAudio(storage=null,key='oakrest-audio'){
 let ctx,enabled=true,volume=.6,voices=0,nextTownPulse=0,townPulseIndex=0;
 const gate=createClassicAudioGate();
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved){enabled=saved.enabled!==false;volume=Math.max(0,Math.min(1,Number(saved.volume)||0));}}catch{}
 const persist=()=>{try{storage?.setItem(key,JSON.stringify({enabled,volume}));}catch{}};
 return {get enabled(){return enabled;},get volume(){return volume;},
 setEnabled(v){const next=!!v;if(next!==enabled){enabled=next;persist();}}, 
 setVolume(v){const n=Number(v);if(!Number.isFinite(n))return;const next=Math.max(0,Math.min(1,n));if(next!==volume){volume=next;persist();}},
 unlock(){if(!enabled||!volume)return;try{ctx??=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume().catch(()=>{});}catch{}},
 cityAmbience(time,insideCity){
  if(!insideCity){nextTownPulse=0;return;}
  if(!enabled||!volume||!ctx||ctx.state!=='running'||voices>=10||time<nextTownPulse)return;
  nextTownPulse=time+10+(townPulseIndex%4)*2;
  // A very quiet four-note original bell phrase and a high bird call. Sparse
  // cues avoid an irritating constant loop, especially on iPad speakers.
  const notes=[392,440,523.25,349.23],hz=notes[townPulseIndex%notes.length];
  const isBird=townPulseIndex%3===2;townPulseIndex++;
  const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
  voices++;osc.type=isBird?'sine':'triangle';
  osc.frequency.setValueAtTime(isBird?1320:hz,t);
  osc.frequency.exponentialRampToValueAtTime(isBird?1680:hz*.89,t+(isBird?.24:.8));
  gain.gain.setValueAtTime(.001,t);
  gain.gain.exponentialRampToValueAtTime((isBird?.018:.014)*volume,t+.06);
  gain.gain.exponentialRampToValueAtTime(.001,t+(isBird?.30:.91));
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(t);osc.stop(t+(isBird?.32:.93));
  osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};
 },
 playAbility(style,kind,family){
  if(!enabled||!volume||!ctx||ctx.state!=='running'||voices>=10)return;
  if(!gate.admit('ability:'+style+':'+kind,ctx.currentTime))return;
  const profile=abilitySoundProfile(style,kind,family);
  const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
  voices++;
  osc.type=profile.wave;
  osc.frequency.setValueAtTime(profile.hz,t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1,profile.hz*profile.sweep),t+profile.seconds);
  gain.gain.setValueAtTime(.001,t);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001,profile.gain*volume),t+.018);
  gain.gain.exponentialRampToValueAtTime(.001,t+profile.seconds);
  osc.connect(gain);gain.connect(ctx.destination);
  osc.start(t);osc.stop(t+profile.seconds+.02);
  osc.onended=()=>{voices=Math.max(0,voices-1);osc.disconnect();gain.disconnect();};
 },
 play(kind,heavy=false){
  if(!enabled||!volume||!ctx||ctx.state!=='running'||voices>=10)return;
  if(!gate.admit(kind,ctx.currentTime))return;
  voices++;const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
  const tones={loot:740,dodge:240,magic:520,bow:330,'spell-impact':460,'arrow-impact':125,guard:620,warning:160,hurt:75,death:65,chop:210,treefall:82};
  const hz=tones[kind]||(heavy?90:180),duration=kind==='treefall'?.56:kind==='warning'?.26:.18;
  osc.type=['hurt','bow','warning'].includes(kind)?'triangle':['hit','chop','treefall'].includes(kind)?'triangle':'sine';
  osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(kind==='loot'?1100:hz*.38,t+duration);
  gain.gain.setValueAtTime(.055*volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.02);
  osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};
 }};
}
