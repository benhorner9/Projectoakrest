/** Short duplicate-sound gate: suppresses event bursts caused by chained
 * hits or repeated refresh callbacks, without modifying gameplay events.
 * Uses AudioContext currentTime, not wall-clock timers.
 */
export function createClassicAudioGate(){
 const last=new Map();
 const intervals={hurt:.11,warning:.30,hit:.07,miss:.10,loot:.12,chop:.09,dodge:.10,death:.50};
 return {admit(kind,time){
  if(!Number.isFinite(time)||time<0)return false;
  const gap=intervals[kind]??.045;
  const previous=last.get(kind);
  if(previous!==undefined&&time>=previous&&time-previous<gap)return false;
  last.set(kind,time);
  return true;
 },reset(){last.clear();}};
}
