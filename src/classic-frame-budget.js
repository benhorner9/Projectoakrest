/** Adaptive renderer density for iPad Safari and desktop.
 * Pure performance policy. Does not alter combat's fixed 60 Hz time step.
 * Samples real presented frames, not time spent in accelerated QA simulation.
 */
export function createClassicFrameBudget({minScale=.62,downStep=.12,upStep=.06}={}){
 let scale=1,elapsed=0,slow=0,fast=0,samples=0,changes=0;
 function reset(){elapsed=0;slow=0;fast=0;samples=0;}
 return {
  sample(deltaMs){
   // A hidden tab, navigation freeze or resume is not a GPU performance sample.
   if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>200)return false;
   elapsed+=deltaMs;samples++;
   if(deltaMs>=23)slow++;
   if(deltaMs<=17.5)fast++;
   if(elapsed<2000)return false;
   const down=samples>=30&&slow/samples>=.54;
   const up=samples>=80&&fast/samples>=.90&&elapsed>=4000;
   // Reducing density must be quick; restoration must be gradual. Never let
   // a single high frame time toggle quality rapidly on a touch device.
   let next=scale;
   if(down)next=Math.max(minScale,scale-downStep);
   else if(up)next=Math.min(1,scale+upStep);
   if(down||up)reset();
   else if(elapsed>=4000)reset();
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
