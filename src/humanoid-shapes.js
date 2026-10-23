/** Project-authored silhouette meshes for the canonical reference humanoid.
 * Rings are [height, half-width, half-depth, depth-centre]. These meshes share
 * the existing joint anchors; changing art never changes capsule or reach.
 * Cached geometry belongs to the module, not to an individual equipment slot.
 */
import * as THREE from 'three';

function loft(rings, sides=8) {
 const positions=[],indices=[];
 for(const [y,x,z,centre=0] of rings)for(let i=0;i<sides;i++){
  const a=(i+.5)*Math.PI*2/sides;
  positions.push(Math.sin(a)*x,y,Math.cos(a)*z+centre);
 }
 for(let row=0;row<rings.length-1;row++)for(let i=0;i<sides;i++){
  const a=row*sides+i,b=row*sides+(i+1)%sides,c=b+sides,d=a+sides;
  indices.push(a,b,d,b,c,d);
 }
 // Rings are ordered bottom-to-top. End caps use the same outward winding.
 for(let i=1;i<sides-1;i++)indices.push(0,i+1,i);
 const top=(rings.length-1)*sides;
 for(let i=1;i<sides-1;i++)indices.push(top,top+i,top+i+1);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.sharedHumanoidShape=true;
 return geometry;
}

export const HUMANOID_SHAPES=Object.freeze({
 torso:loft([[-.41,.29,.19],[-.22,.28,.18],[.10,.37,.22],[.32,.36,.19],[.41,.20,.13]]),
 hips:loft([[-.13,.31,.21],[.08,.31,.21],[.17,.28,.18]]),
 belt:loft([[-.065,.345,.245],[.065,.345,.245]]),
 chest:loft([[-.39,.30,.21],[-.20,.30,.20],[.10,.39,.245],[.32,.38,.215],[.405,.21,.15]]),
 face:loft([[-.29,.115,.12,-.025],[-.21,.19,.185,-.02],[-.06,.25,.225],[.09,.25,.23],[.23,.21,.21],[.30,.10,.12]]),
 hair:loft([[-.52,.94,.92],[.15,1.04,1.04],[.75,.78,.82],[1.05,.28,.38]]),
 upperArm:loft([[-.39,.095,.10],[-.25,.12,.13],[-.08,.15,.15],[.07,.11,.12]]),
 forearm:loft([[-.30,.085,.085],[-.24,.105,.105],[-.06,.115,.11],[.025,.09,.095]]),
 thigh:loft([[-.45,.105,.115],[-.30,.13,.14],[-.06,.16,.17],[.035,.14,.14]]),
 shin:loft([[-.39,.085,.09],[-.28,.105,.105],[-.10,.125,.12],[.025,.115,.115]]),
 shoe:loft([[-.515,.145,.235,-.085],[-.44,.145,.235,-.085],[-.33,.12,.17,-.055],[-.25,.10,.105]]),
 thighArmour:loft([[-.41,.12,.135],[-.30,.15,.16],[-.08,.175,.18],[.01,.16,.155]]),
 greave:loft([[-.40,.105,.12],[-.27,.13,.135],[-.10,.14,.14],[-.045,.12,.13]]),
 pauldron:loft([[-.16,.18,.185],[-.04,.205,.195],[.07,.16,.17],[.12,.08,.10]])
});
