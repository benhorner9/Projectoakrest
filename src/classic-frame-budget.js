/** Adaptive renderer density for iPad Safari and desktop.
 * Pure performance policy. Does not alter combat's fixed 60 Hz time step.
 * Samples real presented frames, not time spent in accelerated QA simulation.
 */
export function createClassicFrameBudget({minScale=.62,downStep=.12,upStep=.06}={}){
 let scale=1,slowPressure=0,fastPressure=0,changes=0;
 function reset(){slowPressure=0;fastPressure=0;}
 return {
  sample(deltaMs){
   // Hidden-tab pauses are not GPU load. Reset the moving pressure, but keep
   // the last known quality until sufficient new foreground samples arrive.
   if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>200){reset();return false;}
   // Recent pressure decays exponentially. Earlier good frames must not
   // mask a new 2-second stretch of truly slow rendering on mobile Safari.
   slowPressure=deltaMs>=22?slowPressure+deltaMs:slowPressure*.82;
   fastPressure=deltaMs<=17.5?fastPressure+deltaMs:fastPressure*.82;
   const down=slowPressure>=2000;
   const up=fastPressure>=4500&&!down;
   let next=scale;
   if(down)next=Math.max(minScale,scale-downStep);
   else if(up)next=Math.min(1,scale+upStep);
   if(down||up)reset();
   if(Math.abs(next-scale)<.00001)return false;
   scale=Math.round(next*1000)/1000;changes++;return true;
  },
  get scale(){return scale;},
  get changes(){return changes;},
  reset
 };
}
export function classicAdaptiveRatio(base,scale){
 const safe=Number.isFinite(base)?Math.max(.75,base):1;
 const factor=Number.isFinite(scale)?Math.min(1,Math.max(.62,scale)):1;
 return Math.max(.5,Math.round(safe*factor*100)/100);
}
