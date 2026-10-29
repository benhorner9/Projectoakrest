/** Canonical natural woodland routes. All renderers, maps and tree clearances
 * consume these *same* sampled curves. No separate fictional painted roads.
 *
 * A damped Catmull–Rom/Hermite centreline rounds authored bends without
 * overshooting toward cliff walls or quest locations. Landmarks remain knots.
 * Simulation (click-to-move, LOS, monster leash) remains obstacle-authoritative.
 */
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function smoothOutdoorTrail(knots,maxStep=4.25){
 if(!Array.isArray(knots)||knots.length<2||!knots.every(finitePoint))return [];
 const output=[[...knots[0]]];
 const tangent=i=>{
  if(i===0)return [(knots[1][0]-knots[0][0])*.45,(knots[1][1]-knots[0][1])*.45];
  if(i===knots.length-1)return [(knots[i][0]-knots[i-1][0])*.45,(knots[i][1]-knots[i-1][1])*.45];
  // Limit endpoint movement around unequal spans. Using a shared tangent
  // for both adjacent sections guarantees no sudden heading discontinuity.
  const prev=knots[i-1],next=knots[i+1];
  const first=Math.hypot(knots[i][0]-prev[0],knots[i][1]-prev[1]);
  const second=Math.hypot(next[0]-knots[i][0],next[1]-knots[i][1]);
  const factor=.45*Math.min(1,2*Math.min(first,second)/Math.max(.0001,first+second));
  return [(next[0]-prev[0])*factor,(next[1]-prev[1])*factor];
 };
 for(let i=0;i<knots.length-1;i++){
  const a=knots[i],b=knots[i+1],m=tangent(i),n=tangent(i+1);
  const distance=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(distance<.001)continue;
  const steps=Math.max(1,Math.ceil(distance/Math.min(4.25,Math.max(.8,maxStep))));
  for(let j=1;j<=steps;j++){
   if(j===steps){output.push([...b]);continue;}
   const t=j/steps,t2=t*t,t3=t2*t;
   const h00=2*t3-3*t2+1,h10=t3-2*t2+t,h01=-2*t3+3*t2,h11=t3-t2;
   output.push([h00*a[0]+h10*m[0]+h01*b[0]+h11*n[0],
    h00*a[1]+h10*m[1]+h01*b[1]+h11*n[1]]);
  }
 }
 return output;
}
/** Permanent, named landmarks are retained; the route between them is soft.
 * No sharp 40m diagonals or zig-zag 'mountain-road' corners. Side trails
 * deliberately end at accessible resource/discovery areas.
 */
export const OUTDOOR_TRAIL_KNOTS=Object.freeze([
 // A northbound woodland spine; the cart is on a side path, not a hairpin.
 [[0,86],[0,94],[2,104],[8,112],[19,117],[21,128],[21,139],
  [23,150],[20,157],[13,168],[0,181]],
 // Short cart approach leaves the north road naturally, without a U-turn.
 [[0,94],[-4,102],[-8,108]],
 // Quarry and woodcutting spurs follow the edge of the gate meadows.
 [[0,93],[-10,92],[-19,91],[-24,91],[-31,95]],
 [[-24,91],[-21,97],[-20,103],[-14,107],[-8,108]],
 // Deep western woodland goes by the singing stump, curves to upper reeds.
 [[-8,108],[-13,115],[-20,126],[-28,135],[-27,140],[-21,143],[-12,142]],
 [[-12,142],[-2,145],[10,148],[23,150]],
 // Cree​kside gathering, watch journal, memorial and the Hollow path.
 [[19,117],[23,113],[26,106]],
 [[23,150],[28,159]],
 [[23,150],[20,158],[16,163],[9,170],[0,181]],
 // Optional discoveries are reached via narrow, quiet footpaths.
 [[-20,126],[-29,118],[-39,115]],
 [[21,139],[30,140],[39,143]]
]);
export const OUTDOOR_TRAILS=Object.freeze(OUTDOOR_TRAIL_KNOTS.map(knots=>
 Object.freeze(smoothOutdoorTrail(knots).map(p=>Object.freeze(p)))));
