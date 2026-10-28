import * as THREE from 'three';
import {OAKREST_PALETTE as P,terrainVariation,organicRoadPolygons,plazaOutline} from './classic-art-direction.js';
import {CLASSIC_ROADS,CLASSIC_PLAZAS} from './classic-town-plan.js';

export function groundPolygons(polygons,y,color){
 const vertices=[];
 for(const points of polygons)for(let i=1;i<points.length-1;i++)
  for(const [x,z] of [points[0],points[i],points[i+1]])vertices.push(x,y,z);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();
 return new THREE.Mesh(g,new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide}));
}
export function createClassicTerrain(root){
 const geometry=new THREE.PlaneGeometry(115,130,46,52);geometry.rotateX(-Math.PI/2);geometry.translate(0,-.025,34);
 const positions=geometry.attributes.position,colors=[],moss=new THREE.Color(P.moss),fern=new THREE.Color(P.fern),meadow=new THREE.Color(P.meadow);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i);
  const variation=terrainVariation(x,z);
  const sunlit=Math.max(0,Math.sin(x*.47+z*.28)*Math.cos(z*.33-x*.23));
  const c=moss.clone().lerp(fern,variation).lerp(meadow,sunlit*.25);
  colors.push(c.r,c.g,c.b);
 }
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
 root.add(new THREE.Mesh(geometry,new THREE.MeshLambertMaterial({vertexColors:true})));
 root.add(groundPolygons(organicRoadPolygons(CLASSIC_ROADS,5.5),.005,P.verge));
 root.add(groundPolygons(organicRoadPolygons(CLASSIC_ROADS),.012,P.path));
 root.add(groundPolygons(CLASSIC_PLAZAS.map(plazaOutline),.025,P.earth));
 // No square paving stones or regularly spaced ground tiles. Oakrest's
 // town centre remains a grassy commons with gently irregular, worn-earth
 // gathering spaces drawn by plazaOutline. This keeps the terrain uncluttered
 // and the town model distinct from RuneScape's tiled paving.
 return {ground:geometry,stones:0};
}
