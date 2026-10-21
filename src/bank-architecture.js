import * as THREE from 'three';
/**
 * Monumental stone banking hall, secured vault, teller line and stored-item
 * displays. Decorations do not hold item data; the existing persistent bank
 * remains the only authority on ownership.
 */
export function furnishGrandBank(group,build,mat,block,wallCollider){
 const {w,d}=build;
 group.name='Oakrest Bank Grand Hall';
 const marble=new THREE.MeshLambertMaterial({color:'#d8d0bc'});
 const named=(name,material,x,y,z,sx,sy,sz,shadow=true)=>{
  const m=block(group,material,x,y,z,sx,sy,sz,shadow);m.name=name;return m;
 };
 named('Bank centre aisle carpet',mat.red,0,.025,2.55,2.25,.035,5.3,false);
 for(const side of [-1,1])for(const z of [-d/2+1.25,d/2-1.45]){
  const x=side*(w/2-1.15);
  named('Bank marble column',marble,x,2.09,z,.83,3.94,.83);
  block(group,mat.gold,x,4.1,z,1.10,.23,1.10);
  block(group,mat.stone,x,.23,z,1.11,.41,1.11);
 }
 // The worker is behind the teller line at local z=-2.7; the player stands
 // on its public-facing side and can transact without walking through it.
 named('Bank three teller counter',mat.stone,0,.89,-1.22,w*.71,1.56,.68);
 block(group,mat.gold,0,1.74,-1.22,w*.73,.14,.77);
 wallCollider(build,0,-1.22,w*.71,.68,1.86);
 for(const x of [-3,0,3]){
  block(group,mat.timber,x,2.35,-1.22,.12,1.25,.12);
  named('Bank teller safety screen',mat.glass,x,2.28,-1.22,2.53,1.02,.04,false);
  block(group,mat.gold,x,2.89,-1.22,2.54,.10,.12);
  named('Bank deposit tray',mat.gold,x,1.78,-.84,.82,.08,.46);
 }
 const gate=-d/2+.30;
 named('Oakrest iron vault door',mat.dark,0,2.02,gate,4.24,3.70,.23);
 for(const x of [-2.04,2.04])block(group,mat.gold,x,2.02,gate+.15,.11,3.80,.15);
 for(const y of [.22,3.87])block(group,mat.gold,0,y,gate+.15,4.26,.11,.15);
 const dial=new THREE.Mesh(new THREE.TorusGeometry(.64,.15,9,20),mat.gold);
 dial.name='Oakrest vault combination lock';
 dial.position.set(0,2.12,gate+.26);group.add(dial);
 for(const x of [-.38,.38])block(group,mat.gold,x,2.12,gate+.28,.09,.90,.12);
 block(group,mat.gold,0,2.12,gate+.29,.90,.09,.14);
 for(const side of [-1,1]){
  const sx=side*(w/2-.63);
  for(let level=0;level<3;level++)for(const z of [-3.9,-2.1,.5,2.3]){
   named('Bank secured storage shelf',mat.timber,sx,level*1.25+.53,z,.80,.13,1.38);
   named(level===2?'Bank sealed gold strongbox':'Bank stored equipment chest',
    level===2?mat.gold:mat.wood,sx,level*1.25+.83,z,.55,.54,.82);
   block(group,mat.gold,sx,level*1.25+.85,z+.43,.42,.08,.08);
  }
 }
 for(const x of [-2.6,2.6]){
  named('Bank hanging lantern',mat.gold,x,4.60,2.05,.14,.68,.14,false);
  block(group,mat.glow,x,4.10,2.05,.55,.37,.55,false);
  block(group,mat.gold,x,3.84,2.05,.62,.11,.62);
 }
 for(const x of [-4.7,4.7])for(const z of [-4.05,-2.35]){
  named('Bank locked archive cabinet',mat.wood,x,1.22,z,1.27,2.28,.53);
  block(group,mat.gold,x,1.32,z+.32,.63,.09,.07);
 }
}

export function buildGrandBankFacade(group,build,h,mat,block,wallCollider){
 const {d}=build;
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.80,.18,10,22),mat.gold);
 ring.name='Bank gold crest';
 ring.position.set(0,h+1.08,d/2+.42);group.add(ring);
 const keystone=block(group,mat.pale,0,h+.76,d/2+.26,1.76,.60,.35);
 keystone.name='Bank engraved keystone';
 // Two pairs of columns and a projecting roof define the bank's identity.
 // The middle 3.15m doorway remains physically open and unobstructed.
 for(const x of [-3.06,3.06]){
  block(group,mat.stone,x,.38,d/2+1.10,1.12,.76,1.12);
  block(group,mat.pale,x,2.62,d/2+1.10,.70,3.75,.70);
  block(group,mat.stone,x,4.52,d/2+1.10,1.19,.35,1.19);
  wallCollider(build,x,d/2+1.10,.73,.73,4.8);
 }
 // The stone approach continues from the set-back civic road to the public
 // doorway but never enters the bank floor. Use shallow individual flagstones.
 for(const distance of [1.95,2.86,3.78,4.70]){
  const stone=block(group,mat.pale,0,.025,d/2+distance,2.52,.045,.70,false);
  stone.name='Grand Bank entrance flagstone';
 }
 const canopy=block(group,mat.stone,0,4.88,d/2+1.09,8.15,.40,2.88);
 canopy.name='Bank monumental stone portico';
 block(group,mat.gold,0,4.62,d/2+2.49,7.40,.12,.12);
 for(const x of [-5.20,5.20]){
  block(group,mat.stone,x,2.12,d/2+.26,.45,4.18,.47);
  block(group,mat.gold,x,4.45,d/2+.26,.62,.18,.52);
 }
}
