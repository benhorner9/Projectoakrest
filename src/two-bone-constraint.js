/** Fixed-length visual IK. Targets/poles/orientations use the upper joint's parent space.
 * Scratch storage is shared; calls are synchronous and allocate nothing per frame.
 * This solver cannot translate the actor, stretch bones or affect collision.
 */
import * as THREE from 'three';
const down=new THREE.Vector3(0,-1,0),direction=new THREE.Vector3(),pole=new THREE.Vector3(),joint=new THREE.Vector3(),lowerDirection=new THREE.Vector3(),q=new THREE.Quaternion(),inv=new THREE.Quaternion();
const EPS=1e-7;
export function solveTwoBone(upper,lower,end,goal,bendPole,orientation){
 const a=lower.position.length(),b=end.position.length();
 direction.copy(goal).sub(upper.position);
 const requested=direction.length(),distance=Math.min(a+b,Math.max(Math.abs(a-b)+EPS,requested));
 if(requested<EPS)direction.set(0,-1,0);else direction.divideScalar(requested);
 pole.copy(bendPole).addScaledVector(direction,-bendPole.dot(direction));
 if(pole.lengthSq()<EPS){pole.set(0,0,1).addScaledVector(direction,-direction.z);
  if(pole.lengthSq()<EPS)pole.set(1,0,0).addScaledVector(direction,-direction.x);
 }
 pole.normalize();
 const along=(a*a-b*b+distance*distance)/(2*distance);
 const height=a+b-distance<EPS?0:Math.sqrt(Math.max(0,a*a-along*along));
 joint.copy(direction).multiplyScalar(along).addScaledVector(pole,height);
 q.setFromUnitVectors(down,lowerDirection.copy(joint).normalize());upper.quaternion.copy(q);
 lowerDirection.copy(direction).multiplyScalar(distance).sub(joint).normalize();
 q.setFromUnitVectors(down,lowerDirection);
 inv.copy(upper.quaternion).invert();lower.quaternion.copy(inv).multiply(q);
 end.quaternion.copy(q).invert().multiply(orientation);
 return Math.abs(requested-distance);
}
