/** Original bounded procedural cues. Settings persist per game environment. */
export function createAudio(storage=null,key='oakrest-audio'){
 let ctx,enabled=true,volume=.6,voices=0;
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved){enabled=saved.enabled!==false;volume=Math.max(0,Math.min(1,Number(saved.volume)||0));}}catch{}
 const persist=()=>{try{storage?.setItem(key,JSON.stringify({enabled,volume}));}catch{}};
 return {get enabled(){return enabled;},get volume(){return volume;},
 setEnabled(v){enabled=!!v;persist();},setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));persist();},
 unlock(){try{ctx??=new (window.AudioContext||window.webkitAudioContext)();ctx.resume().catch(()=>{});}catch{}},
 play(kind,heavy=false){
  if(!enabled||!volume||!ctx||ctx.state!=='running'||voices>=12)return;
  voices++;const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime;
  const tones={loot:740,dodge:240,magic:520,bow:330,warning:160,hurt:75,death:65};
  const hz=tones[kind]||(heavy?90:180),duration=kind==='warning'?.26:.18;
  osc.type=['hurt','bow','warning'].includes(kind)?'triangle':kind==='hit'?'triangle':'sine';
  osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(kind==='loot'?1100:hz*.38,t+duration);
  gain.gain.setValueAtTime(.055*volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  osc.connect(gain);gain.connect(ctx.destination);osc.start(t);osc.stop(t+duration+.02);
  osc.onended=()=>{voices--;osc.disconnect();gain.disconnect();};
 }};
}
