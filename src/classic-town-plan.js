/** Classic-only village masterplan.
 * The original 3D game's canonical building/service anchors are untouched.
 * All Classic renderers, pathfinding, collision and map share these exact paths.
 */
import {OAKREST_PATHS} from './town-layout.js';

const frozenPath=points=>Object.freeze(points.map(p=>Object.freeze(p)));
export const CLASSIC_DISTRICTS=Object.freeze([
 Object.freeze({id:'south',name:'South Gate & Market',x:0,z:7}),
 Object.freeze({id:'west',name:'West Merchant Quarter',x:-23,z:37}),
 Object.freeze({id:'heart',name:'Heartwood Square',x:0,z:39}),
 Object.freeze({id:'east',name:'East Artisan Quarter',x:25,z:48}),
 Object.freeze({id:'north',name:'North Ward & Woodland Gate',x:0,z:74})
]);
// Loop roads provide several distinct routes between quarters. Each terminates
// at a real lane or public square, not a blank building shell or tree trunk.
export const CLASSIC_LOOP_PATHS=Object.freeze([
 // Short links from the two outer gates, without a second broad ring road.
 frozenPath([[-46,39],[-36,39],[-23,39]]),
 frozenPath([[46,39],[35,39],[24,39]]),
 frozenPath([[-23,39],[-23,46]]),
 frozenPath([[24,39],[24,44]]),
 frozenPath([[0,54],[23,54]]),
 frozenPath([[0,75],[24,75]])
]);
/** Exact town floor slabs and roof palettes shared by village renderer and map. */
export const CLASSIC_PLAZAS=Object.freeze([
 {x:0,z:39,w:15,d:14},{x:-19,z:40,w:8,d:8},
 {x:22,z:57,w:9,d:8},{x:0,z:74,w:12,d:7}
]);
export const CLASSIC_STALLS=Object.freeze([
 {x:-17,z:38,roof:'#9b675e'},
 {x:9,z:38,roof:'#728568'},
 {x:19,z:-7,roof:'#627886'}
]);
export const classicRoofColour=(building,index)=>building.kind==='bank'?'#627886':
 ['#9b675e','#728568','#627886'][index%3];
export const CLASSIC_ROADS=Object.freeze([...OAKREST_PATHS,...CLASSIC_LOOP_PATHS]);
const segment=(id,x1,z1,x2,z2)=>Object.freeze({id,a:Object.freeze([x1,z1]),b:Object.freeze([x2,z2])});
export const CLASSIC_PERIMETER=Object.freeze({
 west:-46,east:46,south:-16,north:86,
 gates:Object.freeze([
  Object.freeze({id:'north',x:0,z:86,opening:9,orientation:'horizontal',name:'Woodland Gate'}),
  Object.freeze({id:'south',x:0,z:-16,opening:9,orientation:'horizontal',name:'South Gate'}),
  Object.freeze({id:'west',x:-46,z:39,opening:9,orientation:'vertical',name:'West Gate'}),
  Object.freeze({id:'east',x:46,z:39,opening:9,orientation:'vertical',name:'East Gate'})
 ]),
 walls:Object.freeze([
  segment('south-west',-46,-16,-4.5,-16),
  segment('south-east',4.5,-16,46,-16),
  segment('north-west',-46,86,-4.5,86),
  segment('north-east',4.5,86,46,86),
  segment('west-south',-46,-16,-46,34.5),
  segment('west-north',-46,43.5,-46,86),
  segment('east-south',46,-16,46,34.5),
  segment('east-north',46,43.5,46,86)
 ])
});
export function wallSolidAt(x,z,radius=.38){
 for(const wall of CLASSIC_PERIMETER.walls){
  const [x1,z1]=wall.a,[x2,z2]=wall.b;
  const dx=x2-x1,dz=z2-z1,den=dx*dx+dz*dz;
  const t=Math.max(0,Math.min(1,den?((x-x1)*dx+(z-z1)*dz)/den:0));
  if(Math.hypot(x-(x1+dx*t),z-(z1+dz*t))<=radius+.45)return true;
 }
 return false;
}
