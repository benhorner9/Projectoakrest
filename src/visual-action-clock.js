/** Observe authoritative action timestamps. Never dispatch damage or extend cadence.
 * The striking motion begins before impact and reaches contact exactly at impact.
 * Draw is separate: a bowstring remains drawn until that authoritative instant.
 */
const clamp=v=>Math.min(1,Math.max(0,v));
const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function visualActionClock(t,attack){
 if(!attack||![t,attack.start,attack.impactAt,attack.interval].every(Number.isFinite)||attack.interval<=0)
  return {active:false,wind:0,contact:0,draw:0,recovery:1};
 const end=attack.start+attack.interval;
 if(t<attack.start||t>=end)return {active:false,wind:0,contact:0,draw:0,recovery:1};
 const impact=Math.min(end,Math.max(attack.start,attack.impactAt));
 if(t<impact){
  const progress=clamp((t-attack.start)/Math.max(.000001,impact-attack.start));
  const strike=smooth((progress-.65)/.35);
  return {active:true,wind:smooth(progress/.65)*(1-strike),contact:strike,draw:smooth(progress),recovery:0};
 }
 const recovery=clamp((t-impact)/Math.max(.000001,end-impact));
 return {active:true,wind:0,contact:1-smooth(recovery),draw:0,recovery};
}
