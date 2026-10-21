import * as THREE from 'three';
/**
 * The physical Trade House is ready for the later auction-house economy.
 * No inventory, currency, orders or sales are processed by this file.
 */
export function furnishTradeHall(group,build,mat,block,collider){
 const {w,d}=build,tag=(name,m,x,y,z,sx,sy,sz)=>{
  const o=block(group,m,x,y,z,sx,sy,sz);o.name=name;return o;
 };
 const slab=new THREE.MeshLambertMaterial({color:'#d4c5a8'});
 const teal=new THREE.MeshLambertMaterial({color:'#456875'});
 // A continuous stone floor with a bright central runner from the entrance.
 tag('Trade House tiled concourse',slab,0,.027,0,w-.6,.055,d-.6);
 tag('Trade House entry carpet',mat.red,0,.078,2.3,2.65,.035,7.1);
 for(const side of [-1,1]){
  // Structural gallery columns sit against walls, leaving a five-metre aisle.
  for(const z of [-4.7,0,4.1]){
   tag('Trade House stone gallery column',mat.pale,side*(w/2-.8),2.4,z,.72,4.55,.72);
   block(group,mat.gold,side*(w/2-.8),4.73,z,1.0,.23,1.0);
   block(group,mat.stone,side*(w/2-.8),.19,z,1.0,.36,1.0);
  }
  const x=side*(w/2-2.0);
  for(const z of [1.75,3.95]){
   tag('Trade House merchant display counter',mat.timber,x,.99,z,2.3,.20,1.25);
   for(const dx of [-.90,.90])
    block(group,mat.wood,x+dx,.48,z,.16,.89,.90);
   // Showcase objects are decorative, not player-owned items.
   for(const dx of [-.58,0,.58]){
    tag('Trade House exhibit parcel',dx===0?mat.gold:mat.cloth,x+dx,1.23,z,.36,.31,.46);
   }
  }
  for(const z of [-4.4,-2.7]){
   tag('Trade House secured merchant chest',mat.wood,side*(w/2-1.5),.51,z,1.5,.87,.94);
   block(group,mat.gold,side*(w/2-1.5),.91,z,1.53,.12,.98);
  }
  // The open upper gallery is scenery, not a second playable floor.
  tag('Trade House mezzanine gallery rail',mat.timber,side*(w/2-1.15),3.86,0,.19,.19,d-1.8);
  for(const z of [-4.0,-2.0,0,2.0,4.0]){
   block(group,mat.wood,side*(w/2-1.15),3.55,z,.18,.85,.19);
  }
  tag('Trade House merchant banner',teal,side*(w/2-.30),3.05,-3.0,.14,2.14,.98);
  block(group,mat.gold,side*(w/2-.21),4.26,-3.0,.16,.13,1.13);
 }
 // Future sales are brokered here, behind a real physical registrar counter.
 tag('Trade House registry counter',mat.stone,0,.93,-1.55,8.1,1.55,.72);
 block(group,mat.gold,0,1.75,-1.55,8.2,.14,.82);
 collider(build,0,-1.55,8.1,.72,1.87);
 for(const x of [-2.7,0,2.7]){
  tag('Trade House teller register',mat.wood,x,1.98,-1.47,1.24,.22,.58);
  block(group,mat.gold,x,2.13,-1.41,.72,.06,.38);
 }
 // Sealed auction board. The auction marketplace UI is not active yet.
 tag('Trade House future auction board',mat.dark,0,2.76,-d/2+.31,5.65,2.82,.26);
 tag('Trade House auction board frame',mat.gold,0,4.23,-d/2+.47,6.05,.17,.32);
 for(const x of [-2.93,2.93])
  block(group,mat.gold,x,2.76,-d/2+.46,.17,2.97,.31);
 tag('Trade House future ledger',slab,0,2.75,-d/2+.50,4.92,2.26,.07);
 for(const x of [-1.45,0,1.45])
  for(const y of [2.1,2.83,3.5])
   tag('Trade House empty auction placard',mat.wood,x,y,-d/2+.57,1.1,.40,.05);
 for(const x of [-3.0,3.0]){
  tag('Trade House hanging lantern',mat.gold,x,4.8,2.0,.15,.8,.15);
  tag('Trade House lantern glow',mat.glow,x,4.22,2.0,.53,.42,.53).castShadow=false;
 }
}
export function finishTradeHouseFacade(group,build,h,mat,block,collider){
 const {d}=build,tag=(name,m,x,y,z,sx,sy,sz)=>{
  const o=block(group,m,x,y,z,sx,sy,sz);o.name=name;return o;
 };
 // Twin monumental entrance columns flank the true 3.15m open doorway.
 for(const side of [-1,1]){
  const x=side*2.56;
  tag('Trade House entrance column',mat.pale,x,2.4,d/2+.80,.72,4.5,.72);
  block(group,mat.stone,x,.33,d/2+.80,1.12,.59,1.12);
  block(group,mat.gold,x,4.74,d/2+.80,1.15,.25,1.15);
  collider(build,x,d/2+.80,.73,.73,4.7);
  tag('Trade House merchant standards',mat.red,side*(build.w/2-1.00),3.38,d/2+.35,.56,2.14,.18);
 }
 tag('Trade House stone entrance portico',mat.stone,0,4.96,d/2+.90,7.2,.43,2.35);
 block(group,mat.gold,0,4.75,d/2+2.05,7.0,.15,.14);
 tag('Trade House golden crest',mat.gold,0,h+.72,d/2+.43,1.02,1.06,.25);
 // Individual flush approach flags connect the door to the existing city
 // street, without laying a new full-width road through the square.
 for(const offset of [1.2,2.15,3.1]){
  tag('Trade House entry flagstone',mat.pale,0,.014,d/2+offset,2.65,.045,.78).castShadow=false;
 }
}
export function finishTradeHouseRoof(roof,build,h,mat,block){
 const {d}=build;
 // A second gabled roof detail and small civic clockless cupola give the
 // trade hall a silhouette distinct from homes and the Bank.
 const beacon=block(roof,mat.stone,0,h+2.37,-.4,1.65,1.22,1.65);
 beacon.name='Trade House roof lantern tower';
 const cap=new THREE.Mesh(new THREE.ConeGeometry(1.37,1.15,4),mat.slate);
 cap.name='Trade House cupola roof';
 cap.position.set(0,h+3.43,-.4);cap.rotation.y=Math.PI/4;roof.add(cap);
 for(const side of [-1,1])
  for(const x of [-3.5,3.5]){
   const vent=block(roof,mat.gold,x,h+1.24,side*(d/2-.45),.55,.53,.18);
   vent.name='Trade House upper roof ornament';
  }
}
