/**
 * Short-lived combat meshes: energy slash arcs, impact pulses, projectile glows.
 * Update/dispose every frame. Purely visual and independent of damage calculation.
 */
export function createCombatVisuals(THREE,scene){
 const effects=[];
 const col=hex=>new THREE.Color(hex);
 function spawn(mesh,seconds=.32){if(effects.length>=64){mesh.geometry.dispose();mesh.material.dispose();return mesh;}
  mesh.frustumCulled=false;mesh.renderOrder=4;scene.add(mesh);
  effects.push({mesh,elapsed:0,duration:seconds,baseOpacity:mesh.material.opacity||1});
  return mesh;
 }
 function arc(position,heading,radius,hex,combo=0){
  const r=Math.max(.65,Math.min(1.95,radius*.51));
  const mesh=new THREE.Mesh(
   new THREE.TorusGeometry(r,combo===2?.085:.055,4,24,Math.PI*(combo===2?1.38:1.03)),
   new THREE.MeshBasicMaterial({color:col(hex),transparent:true,opacity:.84,side:THREE.DoubleSide,depthWrite:false,fog:false})
  );
  mesh.position.set(position.x+heading.x*.65,position.y+1.16,position.z+heading.z*.65);
  mesh.rotation.order='YXZ';mesh.rotation.set(-Math.PI/2,Math.atan2(heading.x,-heading.z)+(combo===1?-.4:combo===2?.20:-.18),0,'YXZ');
  spawn(mesh,.26);
 }
 function sweep(strike,hex){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36),3));
  const mesh=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:hex,transparent:true,opacity:.8,depthWrite:false}));
  mesh.userData.sweep=strike;spawn(mesh,strike.profile.duration+.07);
 }
 function field(origin,radius,duration,hex,heightAt=()=>origin.y-1.1){
  const mesh=new THREE.Mesh(new THREE.RingGeometry(radius-.10,radius,40),new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}));
  const points=mesh.geometry.attributes.position;for(let i=0;i<points.count;i++){const x=origin.x+points.getX(i),z=origin.z+points.getY(i);points.setXYZ(i,x,heightAt(x,z)+.055,z);}mesh.geometry.computeBoundingSphere();mesh.userData.fixed=true;spawn(mesh,duration);
 }
 function impact(position,hex,heavy=false){
  const mesh=new THREE.Mesh(
   new THREE.RingGeometry(.22,.34,20),
   new THREE.MeshBasicMaterial({color:col(hex),transparent:true,opacity:heavy?.84:.62,side:THREE.DoubleSide,depthWrite:false,fog:false})
  );
  mesh.rotation.x=-Math.PI/2;mesh.position.set(position.x,position.y+.10,position.z);
  spawn(mesh,heavy?.41:.3);
 }
 function projectile(mesh,hex,style){
  if(style==='ranged'){mesh.geometry.dispose();mesh.geometry=new THREE.CylinderGeometry(.026,.026,.9,5);mesh.geometry.rotateX(Math.PI/2);mesh.scale.set(1,1,1);const tip=new THREE.Mesh(new THREE.ConeGeometry(.09,.23,4),new THREE.MeshBasicMaterial({color:'#d3e2dc'}));tip.rotation.x=-Math.PI/2;tip.position.z=-.53;mesh.add(tip);const feather=new THREE.Mesh(new THREE.BoxGeometry(.18,.012,.20),new THREE.MeshBasicMaterial({color:'#e3d2ad'}));feather.position.z=.36;mesh.add(feather);return tip;}

  const material=new THREE.MeshBasicMaterial({color:hex,transparent:true,opacity:style==='magic'?.3:.18,depthWrite:false,fog:false});
  const halo=new THREE.Mesh(new THREE.SphereGeometry(style==='magic'?.28:.22,8,6),material);
  mesh.add(halo);
  return halo;
 }
 function update(dt){
  for(let i=effects.length-1;i>=0;i--){
   const fx=effects[i];fx.elapsed+=dt;
   const p=Math.min(1,fx.elapsed/fx.duration);
   const strike=fx.mesh.userData.sweep;
   if(strike){
    const end=Math.min(1,fx.elapsed/strike.profile.duration),points=fx.mesh.geometry.attributes.position;
    for(let j=0;j<points.count;j++){const progress=Math.max(0,end-(1-j/(points.count-1))*.22),angle=strike.yaw+(-strike.profile.halfAngle+2*strike.profile.halfAngle*progress)*(strike.reverse?-1:1);
     points.setXYZ(j,strike.origin.x+Math.sin(angle)*strike.reach,strike.origin.y,strike.origin.z-Math.cos(angle)*strike.reach);}
    points.needsUpdate=true;
   }else if(!fx.mesh.userData.fixed)fx.mesh.scale.setScalar(1+p*1.4);
   fx.mesh.material.opacity=fx.baseOpacity*(1-p)*(1-p);
   if(p>=1){
    scene.remove(fx.mesh);
    fx.mesh.geometry.dispose();fx.mesh.material.dispose();effects.splice(i,1);
   }
  }
 }
 function cleanupProjectile(mesh){
  if(!mesh)return;
  for(const child of [...mesh.children]){
   mesh.remove(child);child.geometry?.dispose();child.material?.dispose();
  }
  mesh.geometry?.dispose();mesh.material?.dispose();
 }
 return {arc,sweep,field,impact,projectile,update,cleanupProjectile,get count(){return effects.length;}};
}