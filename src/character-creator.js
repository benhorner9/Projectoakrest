import * as THREE from 'three';
import {createActor,equipActor,applyCharacterAppearance} from './actors.js';
import {APPEARANCE_OPTIONS,CHARACTER_LIMIT} from './characters.js';

/** Mount the creation screen without creating any accounts or overwriting legacy saves. */
export function setupCharacterCreator({listProfiles,getCurrentId,legacyAvailable,onCreate,onSelect,onLegacy}){
 const $=id=>document.getElementById(id);
 const root=$('character-creator'),form=$('creator-form'),section=$('creator-form-section'),
  slots=$('creator-slots'),error=$('creator-error'),preview=$('creator-model');
 let open=false,renderer=null,scene=null,camera=null,avatar=null,rotation=Math.PI;
 const palette=(target,name,colors)=>{
  for(const [i,color] of colors.entries()){
   const label=document.createElement('label');label.className='creator-colour';label.title=color;
   const input=document.createElement('input');input.type='radio';input.name=name;input.value=color;input.checked=i===0;
   const dot=document.createElement('span');dot.style.setProperty('--swatch',color);
   label.append(input,dot);target.append(label);
  }
 };
 palette($('creator-skin'),'skinTone',APPEARANCE_OPTIONS.skinTone);
 palette($('creator-hair'),'hairColor',APPEARANCE_OPTIONS.hairColor);
 palette($('creator-clothes'),'outfitColor',APPEARANCE_OPTIONS.outfitColor);
 function fields(){return Object.fromEntries(new FormData(form).entries());}
 function dispose(){
  if(renderer){renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=null;}
  scene=null;camera=null;avatar=null;
 }
 function preparePreview(){
  if(renderer)return;
  try{
   scene=new THREE.Scene();
   scene.add(new THREE.HemisphereLight('#f3ecd9','#334e43',2.5));
   const key=new THREE.DirectionalLight('#fff1c8',2.1);key.position.set(-3,5,5);scene.add(key);
   avatar=createActor();
   equipActor(avatar,'melee','sword','none');
   avatar.userData.weapon.clear();avatar.userData.offhand.clear();
   avatar.rotation.y=rotation;scene.add(avatar);
   camera=new THREE.PerspectiveCamera(35,1,0.1,30);camera.position.set(0,1.35,5.8);camera.lookAt(0,1.2,0);
   renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(1.25,window.devicePixelRatio||1));renderer.setSize(270,300,false);
   preview.textContent='';preview.append(renderer.domElement);
  }catch{
   dispose();preview.textContent='3D preview unavailable on this browser. Your appearance choices are still saved.';
  }
 }
 function updatePreview(){
  if(!open)return;
  preparePreview();
  if(!avatar||!renderer)return;
  applyCharacterAppearance(avatar,fields());avatar.rotation.y=rotation;
  renderer.render(scene,camera);
 }
 function slotButton(text,sub,fn,kind=''){
  const b=document.createElement('button');b.type='button';b.className='creator-slot '+kind;
  const label=document.createElement('span'),title=document.createElement('strong');title.textContent=text;
  const caption=document.createElement('small');caption.textContent=sub;label.append(title,caption);b.append(label);
  b.addEventListener('click',fn);slots.append(b);
 }
 function renderRoster(){
  slots.textContent='';
  const profiles=listProfiles(),current=getCurrentId();
  for(const item of profiles)slotButton(item.name,item.id===current?'Current character · Continue':'Load saved character',()=>{
    try{onSelect(item);hide();}catch(e){error.textContent=e.message||'Could not load character.';}
  },item.id===current?'is-current':'');
  if(legacyAvailable())slotButton('Original Oakrest Save','Continue your existing prototype character',()=>{
    try{onLegacy();hide();}catch(e){error.textContent=e.message||'Could not load previous save.';}
  });
  if(profiles.length<CHARACTER_LIMIT)slotButton('+ Create new character','Empty slot '+(profiles.length+1)+' / '+CHARACTER_LIMIT,()=>showNew(), 'create');
  $('creator-confirm').disabled=profiles.length>=CHARACTER_LIMIT;
 }
 function showNew(){
  section.hidden=false;error.textContent='';
  form.reset();rotation=Math.PI;updatePreview();
  $('creator-name').focus({preventScroll:true});
 }
 function show(){
  if(open)return;open=true;root.hidden=false;renderRoster();
  section.hidden=listProfiles().length>=CHARACTER_LIMIT;
  if(!section.hidden)updatePreview();
 }
 function hide(){open=false;root.hidden=true;dispose();error.textContent='';}
 form.addEventListener('input',updatePreview);
 form.addEventListener('change',updatePreview);
 $('creator-rotate').addEventListener('click',()=>{rotation+=Math.PI/4;updatePreview();});
 form.addEventListener('submit',event=>{
  event.preventDefault();error.textContent='';
  try{onCreate(fields());hide();}
  catch(e){error.textContent=e.message||'Character could not be saved.';}
 });
 $('creator-close').addEventListener('click',hide);
 return {show,hide,refresh:renderRoster,isOpen:()=>open};
}
