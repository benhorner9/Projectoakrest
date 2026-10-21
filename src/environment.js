import * as THREE from 'three';
import {mergeGeometries} from '../vendor/BufferGeometryUtils.js';
import {terrainHeight} from './terrain.js';
const mats=new Map();function mat(c){if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:.92}));return mats.get(c);}
const cube=new THREE.BoxGeometry(1,1,1),orb=new THREE.IcosahedronGeometry(1,1),trunk=new THREE.CylinderGeometry(.18,.29,1,7);
function piece(g,geo,c,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
const block=(g,c,x,y,z,sx,sy,sz)=>piece(g,cube,c,x,y,z,sx,sy,sz);
export function cottageModel(x,z,index){const g=new THREE.Group();g.position.set(x,0,z);const plaster=index%2?'#c9bb9c':'#ded0ac',timber='#594b3a',roof=index%2?'#526f70':'#81624e';
 block(g,'#879083',0,.35,0,8,.7,6);block(g,plaster,0,2.25,0,7.8,3.8,5.8);
 for(const side of [-1,1]){const shape=new THREE.Shape();shape.moveTo(-4.4,0);shape.lineTo(0,2.6);shape.lineTo(4.4,0);shape.closePath();const end=piece(g,new THREE.ShapeGeometry(shape),plaster,0,4.15,side*2.91);if(side===-1)end.rotation.y=Math.PI;}
 for(const s of [-1,1]){const r=block(g,roof,s*2.25,5.3,0,5.3,.20,7.1);r.rotation.z=-s*.53;for(let i=0;i<6;i++){const seam=block(g,index%2?'#426061':'#70553f',s*(.45+i*.72),6.38-i*.43,0,.08,.08,7.15);seam.rotation.z=-s*.53;}}
 block(g,timber,0,6.57,0,.27,.25,7.4);for(const xx of [-3.78,0,3.78])block(g,timber,xx,2.35,3,.18,4.1,.20);for(const yy of [.7,3.9])block(g,timber,0,yy,3.04,7.9,.17,.16);
 const brace=block(g,timber,-2.6,3.1,3.03,.14,2,.12);brace.rotation.z=-.7;
 block(g,'#70583a',-.8,1.65,3.05,1.45,2.65,.16);for(let i=0;i<5;i++)block(g,'#5b4834',-1.4+i*.3,1.65,3.15,.018,2.6,.025);piece(g,orb,'#c1a46c',-.25,1.55,3.2,.07,.07,.07);
 block(g,'#a3a28b',-.8,.18,3.7,2.1,.35,1.1);
 for(const wx of [-2.7,2.3]){block(g,timber,wx,2.6,3.1,1.45,1.55,.15);block(g,'#d7ae6b',wx,2.6,3.20,1.18,1.24,.06);for(const s of [-1,1]){block(g,roof,wx+s*.80,2.6,3.18,.28,1.4,.10);block(g,timber,wx+s*.26,2.6,3.26,.07,1.25,.06);}block(g,timber,wx,2.6,3.25,1.2,.08,.07);block(g,'#74583e',wx,1.75,3.35,1.6,.28,.55);for(let i=0;i<5;i++)piece(g,orb,i%2?'#708554':'#c5ad7a',wx-.6+i*.3,1.98,3.4,.16,.19,.17);}
 block(g,'#8d9183',-2.5,5.65,-.5,.85,2.8,.9);for(const y of [4.8,5.4,6,6.6])block(g,'#737d72',-2.5,y,-.5,.92,.08,.96);block(g,timber,-2.5,7.1,-.5,1.12,.2,1.12);
 // Side walls carry beams and shuttered windows as the player walks past.
 for(const s of [-1,1]){block(g,timber,s*3.96,2.2,0,.14,3.5,.20);block(g,timber,s*3.96,3.85,0,.14,.17,5.9);block(g,roof,s*4,2.45,-1.6,.10,1.2,1.3);}
 return g;
}
export function treeModel(x,z,h,index){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=index*2.4;const broad=index%4!==0;piece(g,trunk,'#655342',0,1.6*h,0,h,3.2*h,h);
 if(broad){for(let j=0;j<5;j++){const a=j*2.4,branch=piece(g,trunk,'#655342',Math.sin(a)*.48*h,(2.3+j*.12)*h,Math.cos(a)*.48*h,.42*h,1.8*h,.42*h);branch.rotation.z=Math.sin(a)*.7;branch.rotation.x=Math.cos(a)*.7;piece(g,orb,j%2?'#5c7951':'#77945b',Math.sin(a)*1.1*h,(3.5+j%2*.6)*h,Math.cos(a)*1.0*h,1.65*h,1.2*h,1.5*h);}piece(g,orb,'#829b60',0,4.7*h,0,1.4*h,1.1*h,1.35*h);}
 else for(let j=0;j<4;j++)piece(g,new THREE.ConeGeometry((1.75-j*.33)*h,2.3*h,8),j%2?'#426955':'#51785a',0,(2.4+j*.8)*h,0);
 return g;
}
export function addLandmarks(scene){
 const ring=new THREE.Mesh(new THREE.RingGeometry(2.3,2.45,32),mat('#c0b28a'));ring.rotation.x=-Math.PI/2;ring.position.set(-6,.015,-3);scene.add(ring);
 for(const s of [-1,1]){const g=new THREE.Group();g.position.set(s*4.1,terrainHeight(s*4.1,-9),-9);block(g,'#8b9380',0,.35,0,1.3,.7,1.3);const flag=block(g,'#527b76',0,3.35,0,.7,1.6,.06);piece(g,orb,'#d8bc79',0,3.35,-.05,.18,.29,.06);scene.add(g);}
 // Far silhouettes establish a valley beyond the playable forest.
 for(let i=0;i<12;i++){const g=new THREE.Group();g.position.set(-74+i*14,0,-145);const ridge=new THREE.ConeGeometry(16,12+i%3*4,9,3);const rp=ridge.attributes.position;for(let j=0;j<rp.count;j++){const x=rp.getX(j),y=rp.getY(j),z=rp.getZ(j);rp.setXYZ(j,x+Math.sin(z*.3+i)*2,y+Math.sin(x*.3+i)*1.1,z);}ridge.computeVertexNormals();piece(g,ridge,i%2?'#68857c':'#728f82',0,2+i%3,0,1,1,.75);scene.add(g);}
}
/** Bake immobile scenery by material/shadow bucket. Animation and actors stay separate. */
export function batchScenery(scene){scene.updateMatrixWorld(true);const buckets=new Map(),original=[];
 scene.traverse(o=>{if(!o.visible||!o.isMesh||o.isInstancedMesh||o.userData.animated||o.material?.side===THREE.BackSide||o.material?.transparent)return;
 const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);});
 for(const list of buckets.values()){if(list.length<3)continue;const geometries=list.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);if(!o.material.map)g.deleteAttribute('uv');return g;});const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)continue;const result=new THREE.Mesh(geometry,list[0].material);result.castShadow=list[0].castShadow;result.receiveShadow=list[0].receiveShadow;for(const m of list){m.removeFromParent();original.push(m.geometry);}scene.add(result);}
 const stillUsed=new Set();scene.traverse(o=>{if(o.geometry)stillUsed.add(o.geometry);});for(const g of new Set(original))if(!stillUsed.has(g))g.dispose();
}
