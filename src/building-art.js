import * as THREE from 'three';
/**
 * Shared low-poly architectural polish. Decorative pieces are batched with the
 * world unless tagged as camera-facing cutaway pieces. All embellishments stay
 * outside the 3.15m-wide working doorway and off the central indoor aisle.
 */
const potGeo=new THREE.CylinderGeometry(.37,.29,.56,8);
const orb=new THREE.IcosahedronGeometry(1,1);
function make(g,m,x,y,z,sx,sy,sz){
 const obj=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),m);
 obj.position.set(x,y,z);obj.scale.set(sx,sy,sz);
 obj.castShadow=true;obj.receiveShadow=true;g.add(obj);return obj;
}
function book(g,mat,x,y,z){return make(g,mat,x,y,z,.14,.30,.22);}
function lowWindow(g,mat,base,x,y,z){
 make(g,mat.wood,x,y,z,1.43,.12,.26);
 make(g,mat.trim,x,y-.14,z+.14,1.68,.18,.46);
 make(g,mat.timber,x,y+.64,z,1.52,.15,.32);
}
function lantern(g,mat,x,y,z){
 make(g,mat.wood,x,y+.44,z,.09,.44,.09);
 make(g,mat.gold,x,y+.17,z,.44,.12,.44);
 make(g,mat.glow,x,y,z,.32,.38,.32).castShadow=false;
 make(g,mat.gold,x,y-.22,z,.44,.12,.44);
}
export function addArchitecturalFinish(g,build,h,mat){
 const {w,d,kind}=build;
 const marked=[];
 const part=(side,m,x,y,z,sx,sy,sz)=>{
  const mesh=make(g,m,x,y,z,sx,sy,sz);
  marked.push({mesh,side});return mesh;
 };
 const palace=['trade','bank','hall','guard'].includes(kind);
 // Height and corner framing are controlled by the actual building geometry.
 // Low masonry stays in place during cutaway; only the upper elevations lift.
 const cornice=palace?mat.pale:mat.trim;
 for(const side of [-1,1]){
  const x=side*(w/2+.025);
  for(const z of [-d*.36,0,d*.36]){
   for(let floor=0;floor<3;floor++){
    const upper=1.02+floor*.93;
    part(side<0?'left':'right',palace?mat.stone:mat.timber,
      x,upper,z,.24,.84,.28);
   }
  }
  // Raised quoins and decorative braces make each end structurally legible.
  for(const z of [-d/2,d/2]){
   for(let i=0;i<5;i++){
    const yy=.69+i*(h-.92)/5;
    part(side<0?'left':'right',palace?mat.pale:mat.wood,x,yy,z,.42,.36,.48);
   }
  }
 }
 // A continuous eave moulding lines up with both actual sloped roof ends.
 part('front',cornice,0,h-.16,d/2+.20,w+.28,.18,.48);
 part('back',cornice,0,h-.16,-d/2-.18,w+.28,.18,.43);
 const frame=palace?mat.stone:mat.timber;
 // Distinct raised door arch and visible threshold, never a solid door mesh.
 for(const x of [-1.87,1.87]){
  part('front',frame,x,1.76,d/2+.32,.29,3.37,.30);
  const lanternX=x>0?2.55:-2.55;
  part('front',mat.gold,lanternX,2.55,d/2+.47,.35,.10,.30);
  part('front',mat.glow,lanternX,2.31,d/2+.47,.28,.34,.24);
 }
 part('front',cornice,0,3.54,d/2+.32,4.20,.35,.40);
 part('front',mat.pale,0,3.75,d/2+.36,.65,.42,.48);
 // Working-class houses wear exposed timber; civic buildings receive a pale
 // dressed-stone belt course and wider cornerwork.
 if(!palace){
  for(const side of [-1,1]){
   const x=side*(w*.29),z=d/2+.24;
   part('front',mat.wood,x,h*.66,z,.15,h*.42,.18);
   const brace=part('front',mat.timber,side*(w*.32),h*.74,z+.01,.12,1.43,.15);
   brace.rotation.z=side*.48;
  }
  for(const z of [-d*.19,d*.16])for(const side of [-1,1])
   part(side<0?'left':'right',mat.timber,side*(w/2+.17),h*.68,z,.16,.92,.13);
 }else{
  part('front',mat.pale,0,h*.80,d/2+.23,w*.72,.23,.34);
  for(const side of [-1,1])part('front',mat.gold,side*(w*.32),h*.80,d/2+.45,.14,.34,.12);
 }
 if(kind==='workshop'){
  part('front',mat.stone,w*.33,.48,d/2+.47,1.55,.56,.95);
  for(let i=0;i<3;i++)part('front',mat.wood,w*.33-.50+i*.49,1.00,d/2+.44,.15,.45,.15);
 }
 if(kind==='forester'){
  part('front',mat.wood,-w*.32,.71,d/2+.57,1.50,.24,1.22);
  for(let i=0;i<3;i++)part('front',mat.timber,-w*.32+(i-1)*.40,1.0,d/2+.57,.30,.52,.35);
 }
 if(kind==='home'){
  for(const side of [-1,1])lowWindow(g,mat,cornice,side*(w/2-.91),h*.52+.58,d/2+.58);
  // These window trims are on the facade, and must disappear with it.
  for(const mesh of g.children.slice(-6))marked.push({mesh,side:'front'});
 }
 return marked;
}
export function furnishDistinctInterior(g,build,mat){
 const {w,d,kind}=build;
 if(['trade','bank'].includes(kind))return;
 const table=(x,z)=>{
  make(g,mat.timber,x,.91,z,1.38,.18,.93);
  for(const xx of [-.52,.52])for(const zz of [-.30,.30])
   make(g,mat.wood,x+xx,.44,z+zz,.12,.77,.12);
 };
 const chest=(x,z)=>{
  make(g,mat.wood,x,.49,z,1.18,.85,.74);
  make(g,mat.trim,x,.94,z,1.20,.12,.77);
  make(g,mat.gold,x,.58,z+.38,.17,.32,.08);
 };
 const shelf=(x,z)=>{
  for(const y of [1.16,2.38])make(g,mat.wood,x,y,z,1.60,.17,.48);
  for(const i of [-2,-1,0,1,2])book(g,i%2?mat.red:mat.blue,x+i*.27,1.48,z+.05);
 };
 if(kind==='store'){
  shelf(-w*.32,-d*.18);
  chest(w*.32,-d*.31);
  for(const x of [-2.2,-1.55,1.55,2.2]){
   make(g,mat.moss,x,.55,d*.11,.54,.68,.54);
   make(g,mat.trim,x,.96,d*.11,.54,.11,.54);
  }
 }else if(kind==='forester'){
  shelf(-w*.31,-d*.32);
  for(const xx of [-1,0,1])make(g,mat.timber,w*.31+xx*.39,.34,-d*.31,.31,.61,1.17);
  make(g,mat.moss,w*.30,.30,d*.20,1.58,.31,1.08);
 }else if(kind==='hall'){
  make(g,mat.red,0,.023,d*.13,w*.44,.05,d*.42).castShadow=false;
  for(const x of [-w*.36,w*.36]){
   make(g,mat.blue,x,2.68,-d/2+.27,1.08,2.28,.12);
   make(g,mat.gold,x,3.76,-d/2+.34,1.22,.15,.14);
   chest(x,d*.13);
  }
  lantern(g,mat,0,3.76,-d*.03);
 }else if(kind==='guard'){
  for(const side of [-1,1]){
   const x=side*w*.34;
   make(g,mat.stone,x,1.65,-d*.25,.57,2.24,.23);
   make(g,mat.gold,x,2.74,-d*.23,.37,.19,.35);
  }
  shelf(-w*.33,d*.11);
 }else if(kind==='workshop'){
  table(-w*.24,d*.10);
  for(const x of [-.52,.20,.73])
   make(g,mat.stone,w*.31+x,1.38,-d*.29,.18,.35,.34);
  shelf(-w*.32,-d*.33);
 }else if(kind==='home'){
  chest(w*.31,d*.13);
  table(-w*.15,d*.16);
  const rug=make(g,mat.red,.20,.018,.25,2.30,.035,1.75);
  rug.castShadow=false;
  shelf(-w*.31,-d*.40);
  lantern(g,mat,w*.23,2.60,-d*.34);
 }
}
