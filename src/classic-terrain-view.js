import * as THREE from 'three';
import {OAKREST_PALETTE as P,terrainVariation,terrainPatch,organicRoadPolygons,
 trailDetailPolygons,plazaOutline,block1TerrainTones} from './classic-art-direction.js';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from './classic-town-plan.js';

/** Single draw-call surface per layer; no thousands of separate ground meshes. */
export function groundPolygons(polygons,y,color){
 const vertices=[];
 for(const points of polygons)for(let i=1;i<points.length-1;i++)
  for(const [x,z] of [points[0],points[i],points[i+1]])vertices.push(x,y,z);
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 g.computeVertexNormals();
 return new THREE.Mesh(g,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
}
export function createClassicTerrain(root){
 // The navigable world remains a flat physics plane; subtle mesh-only height and
 // vertex colours make the grass look varied without invalidating player paths.
 const geometry=new THREE.PlaneGeometry(126,154,63,77);
 geometry.rotateX(-Math.PI/2);geometry.translate(0,-.055,38);
 const positions=geometry.attributes.position,colors=[];
 const shaded=new THREE.Color(P.moss),lush=new THREE.Color(P.fern),
  green=new THREE.Color(P.meadow),dry=new THREE.Color('#86906a'),
  forest=new THREE.Color('#4d715b'),soil=new THREE.Color('#938463');
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i);
  const variation=terrainVariation(x,z),patch=terrainPatch(x,z),tone=block1TerrainTones(x,z);
  // Keep micro-elevation BELOW the walk plane. The road meshes cover it.
  positions.setY(i,-.053+(patch-.5)*.025);
  const colour=shaded.clone().lerp(lush,variation*.86)
   .lerp(green,Math.max(0,1-Math.abs(variation-.62)*2)*.26)
   .lerp(dry,Math.max(0,patch-.6)*.42)
   .lerp(forest,tone.forest*.27).lerp(soil,tone.dry*.1+tone.soil*.1);
  colors.push(colour.r,colour.g,colour.b);
 }
 geometry.computeVertexNormals();
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 const meadow=new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
 meadow.name='oakrest-natural-meadow';root.add(meadow);
 // Four distinct material widths, with shared centreline and tapered shoulder
 // geometry. No player-facing regular square paving or disconnected road tiles.
 const bands=[
  [5.2,.001,P.verge,'oakrest-soft-grass-verges'],
  [4.35,.006,P.earth,'oakrest-dusty-road-shoulders'],
  [3.35,.012,P.trail,'oakrest-packed-earth-paths'],
  [1.85,.017,P.path,'oakrest-footworn-track']
 ];
 for(const [width,y,colour,name] of bands){
  const mesh=groundPolygons(organicRoadPolygons(CLASSIC_ROADS,width),y,colour);
  mesh.name=name;root.add(mesh);
 }
 // The village square reads as a natural market clearing instead of a tile field.
 const plazaBase=groundPolygons(CLASSIC_PLAZAS.map(plazaOutline),.023,P.earth);
 plazaBase.name='oakrest-market-clearing';root.add(plazaBase);
 const plazaInner=groundPolygons(CLASSIC_PLAZAS.map(p=>plazaOutline({...p,w:p.w*.82,d:p.d*.82})),.027,P.packed);
 plazaInner.name='oakrest-market-worn-centres';root.add(plazaInner);
 const details=trailDetailPolygons(CLASSIC_ROADS);
 const gravel=groundPolygons(details.gravel,.035,P.gravel);
 gravel.name='oakrest-irregular-trail-gravel';root.add(gravel);
 const wheelWear=groundPolygons(details.worn,.033,P.ruts);
 wheelWear.name='oakrest-faint-wagon-wear';root.add(wheelWear);
 return {ground:geometry,stones:0,gravel:details.gravel.length,roadBands:bands.length};
}
