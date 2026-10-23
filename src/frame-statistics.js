/** Summarise raw requestAnimationFrame intervals; never clamp measurement data.
 * A diagnostic sample is not a device acceptance result. Insufficient samples
 * remain explicit, including JSON-safe nulls when no interval was observed.
 */
export function summarizeFrameTimes(intervals,{warmup=5,minSamples=60}={}){
 const samples=intervals.slice(Math.max(0,warmup)).filter(v=>Number.isFinite(v)&&v>0).sort((a,b)=>a-b);
 const count=samples.length,durationMs=samples.reduce((a,b)=>a+b,0),meanFrameMs=count?durationMs/count:null;
 const percentile=p=>count?samples[Math.min(count-1,Math.ceil(count*p)-1)]:null;
 return {status:count>=minSamples?'sampled':'insufficient-samples',sampleCount:count,minimumSamples:minSamples,durationMs,
  meanFrameMs,meanFPS:meanFrameMs?1000/meanFrameMs:null,p50FrameMs:percentile(.5),p95FrameMs:percentile(.95),p99FrameMs:percentile(.99),
  overBudgetFrames:samples.filter(v=>v>1000/60+.1).length};
}
