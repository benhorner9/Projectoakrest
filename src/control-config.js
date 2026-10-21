/** Independent camera and standard Gamepad API input model. Browser-safe, no dependency on Three.js. */
export const CAMERA_DEFAULTS=Object.freeze({
 sensitivity:1,zoom:7.8,height:2.8,fov:62,smoothing:10,invertY:false,gamepadDeadzone:.18,mode:'free'
});
export const CAMERA_LIMITS=Object.freeze({
 sensitivity:[.6,1.8],zoom:[4,13],height:[1,5],fov:[50,85],smoothing:[4,20],gamepadDeadzone:[.1,.35]
});
export const clampCamera=(value,min,max)=>Math.max(min,Math.min(max,value));
export function normalizeCameraSettings(raw={}){
 const settings={};
 for(const [key,[min,max]] of Object.entries(CAMERA_LIMITS)){
  const input=Number(raw[key]);settings[key]=raw[key]!==undefined&&raw[key]!==null&&Number.isFinite(input)
   ?clampCamera(input,min,max):CAMERA_DEFAULTS[key];
 }
 settings.invertY=raw.invertY===true||raw.invertY==='true';
 settings.mode=raw.mode==='follow'?'follow':'free';
 return settings;
}
export function readCameraSettings(store,key){
 try{return normalizeCameraSettings(JSON.parse(store.getItem(key)||'null')||{});}
 catch{return normalizeCameraSettings();}
}
export function applyGamepadDeadzone(value,deadzone=.18){
 if(!Number.isFinite(value))return 0;
 const magnitude=Math.abs(value);
 if(magnitude<=deadzone)return 0;
 return Math.sign(value)*Math.min(1,(magnitude-deadzone)/(1-deadzone));
}
export function gamepadSnapshot(pad,deadzone=.18){
 if(!pad||pad.connected===false||pad.mapping!=='standard')return null;
 const axes=(pad.axes||[]);
 const axis=index=>applyGamepadDeadzone(axes[index]??0,deadzone);
 const buttons=(pad.buttons||[]);
 const pressed=index=>Boolean(buttons[index]?.pressed||buttons[index]?.value>.55);
 const value=index=>Math.min(1,Math.max(0,Number(buttons[index]?.value)||0));
 return {
  index:pad.index,label:pad.id||'Gamepad',
  moveX:axis(0),moveY:axis(1),lookX:axis(2),lookY:axis(3),
  attack:pressed(0)||value(7)>.25,dodge:pressed(1),
  swap:pressed(2),interact:pressed(3),previousStyle:pressed(4),nextStyle:pressed(5),
  inventory:pressed(8),menu:pressed(9),
  abilities:[pressed(12),pressed(13),pressed(14),pressed(15)]
 };
}
export function firstStandardGamepad(pads,deadzone=.18){
 if(!pads)return null;
 for(const pad of pads){
  const snapshot=gamepadSnapshot(pad,deadzone);
  if(snapshot)return snapshot;
 }
 return null;
}
export function gamepadEdges(previous,current){
 const props=['dodge','swap','interact','previousStyle','nextStyle','inventory','menu'];
 const out={};
 for(const key of props)out[key]=Boolean(current?.[key]&&!previous?.[key]);
 out.abilities=[0,1,2,3].map(i=>Boolean(current?.abilities[i]&&!previous?.abilities?.[i]));
 return out;
}
export function cameraOrbitVector(yaw,pitch,zoom,height){
 // Preserve forward-independent 3rd person follow orbit, incorporating both
 // camera yaw and vertical pitch rather than moving only along a fixed vector.
 const a=Math.max(-.5,Math.min(.9,pitch)),radius=Math.cos(a)*zoom;
 return {x:-Math.sin(yaw)*radius,y:height+Math.sin(a)*zoom,z:Math.cos(yaw)*radius};
}
export function frameDamping(rate,dt){return 1-Math.exp(-rate*Math.max(0,dt));}
