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
 frozenPath([[-39,-10],[-39,6],[-39,22],[-39,39],[-39,57],[-39,78],[-39,83]]),
 frozenPath([[39,-10],[39,6],[39,22],[39,39],[39,57],[39,78],[39,83]]),
 frozenPath([[-39,-10],[-21,-10],[0,-10],[21,-10],[39,-10]]),
 frozenPath([[-39,83],[-20,83],[0,83],[20,83],[39,83]]),
 frozenPath([[-39,6],[-21,6],[-8,6]]),
 frozenPath([[39,6],[21,6],[8,6]]),
 frozenPath([[-39,22],[-21,22],[-9,22]]),
 frozenPath([[39,22],[21,22],[9,22]]),
 frozenPath([[-39,39],[-22,39],[-10,39],[0,39]]),
 frozenPath([[39,39],[27,39],[27,35],[25,32],[22,30]]),
 frozenPath([[-39,57],[-21,57],[-9,57],[0,57]]),
 frozenPath([[39,57],[22,57],[9,57],[0,57]]),
 frozenPath([[-39,78],[-22,84],[-8,84],[0,84]]),
 frozenPath([[39,78],[22,84],[8,84],[0,84]]),
 frozenPath([[0,-22],[0,-16],[0,-10],[0,0]]),
 frozenPath([[0,79],[0,86],[0,94]]),
 frozenPath([[-53,39],[-46,39],[-39,39]]),
 frozenPath([[53,39],[46,39],[39,39]])
]);
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
