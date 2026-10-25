/** Small-screen Classic character creator, using the same roster as original Oakrest.
 * Portrait uses the actual directional sprite atlas, never a second WebGL context.
 */
import {CHARACTER_LIMIT,APPEARANCE_OPTIONS,safeAppearance} from './characters.js';
import {classicRoster,createClassicProfile,chooseClassicProfile} from './classic-character-data.js';
import {makeClassicActor} from './classic-sprites.js';
import {storageKey} from './storage-key.js';

export function setupClassicCharacterUI({storage,pathname,onOpen=()=>{},beforeSwitch=()=>true}){
 const root=document.getElementById('classic-creator'),
  list=document.getElementById('classic-creator-roster'),
  form=document.getElementById('classic-creator-form'),
  editor=document.getElementById('classic-creator-editor'),
  error=document.getElementById('classic-creator-error'),
  canvas=document.getElementById('classic-creator-preview'),
  close=document.getElementById('classic-creator-close'),
  create=document.getElementById('classic-creator-new');
 const context=canvas.getContext('2d');
 let direction=0;
 function addSwatches(key,container){
  const box=document.getElementById(container);
  for(const [index,color] of APPEARANCE_OPTIONS[key].entries()){
   const label=document.createElement('label');label.className='classic-creator-swatch';
   const radio=document.createElement('input');radio.type='radio';radio.name=key;radio.value=color;
   radio.checked=index===0;radio.setAttribute('aria-label',key+' choice '+(index+1));
   const sample=document.createElement('span');sample.style.backgroundColor=color;
   label.append(radio,sample);box.append(label);
  }
 }
 addSwatches('skinTone','classic-creator-skin');
 addSwatches('hairColor','classic-creator-hair');
 addSwatches('outfitColor','classic-creator-outfit');
 function getAppearance(){return safeAppearance(Object.fromEntries(new FormData(form).entries()));}
 function preview(){
  if(!context)return;
  const options=getAppearance();
  const actor=makeClassicActor({coat:options.outfitColor,skin:options.skinTone,
   hair:options.hairColor,outfit:options.outfit,hairstyle:options.hairstyle,sex:options.sex});
  actor.update({facing:{x:Math.sin(direction*Math.PI/4),z:-Math.cos(direction*Math.PI/4)},worn:{}});
  context.imageSmoothingEnabled=false;context.clearRect(0,0,canvas.width,canvas.height);
  const image=actor.sprite.material.map?.image;
  if(image)context.drawImage(image,0,0,canvas.width,canvas.height);
  actor.dispose();
 }
 function button(label,detail,callback,active=false){
  const b=document.createElement('button');b.type='button';b.className='classic-creator-profile'+(active?' is-current':'');
  const title=document.createElement('strong');title.textContent=label;
  const subtitle=document.createElement('small');subtitle.textContent=detail;
  b.append(title,subtitle);b.addEventListener('click',callback);list.append(b);
 }
 function switchCharacter(id){
  error.textContent='';
  if(!beforeSwitch())return;
  try{chooseClassicProfile(storage,pathname,id);location.reload();}
  catch(e){error.textContent=e.message||'Could not select the character.';}
 }
 function roster(){
  list.textContent='';
  const profiles=classicRoster(storage,pathname),
   active=storage.getItem(storageKey('oakrest-active-character',pathname));
  for(const p of profiles){
   button(p.name,p.id===active?'Current adventurer':'Continue this adventurer',
    ()=>switchCharacter(p.id),p.id===active);
  }
  if(storage.getItem(storageKey('oakrest-v1',pathname)))
   button('Original Adventurer','Continue earlier Oakrest save',()=>switchCharacter(null));
  create.disabled=profiles.length>=CHARACTER_LIMIT;
  create.textContent=profiles.length>=CHARACTER_LIMIT?
   'ALL THREE CHARACTER SLOTS FILLED':'+ CREATE CHARACTER ('+(profiles.length+1)+' / '+CHARACTER_LIMIT+')';
 }
 function show(){
  onOpen();
  root.hidden=false;error.textContent='';direction=0;roster();
  const profiles=classicRoster(storage,pathname);
  editor.hidden=profiles.length>0||profiles.length>=CHARACTER_LIMIT;
  if(!editor.hidden){form.reset();preview();}
  create.focus({preventScroll:true});
 }
 function hide(){root.hidden=true;error.textContent='';}
 close.addEventListener('click',hide);
 create.addEventListener('click',()=>{
  if(create.disabled)return;
  editor.hidden=false;form.reset();direction=0;preview();
  document.getElementById('classic-creator-name').focus({preventScroll:true});
 });
 form.addEventListener('input',preview);
 form.addEventListener('change',preview);
 document.getElementById('classic-creator-turn').addEventListener('click',()=>{
  direction=(direction+1)%8;preview();
 });
 form.addEventListener('submit',e=>{
  e.preventDefault();error.textContent='';
  if(!beforeSwitch())return;
  try{
   createClassicProfile(storage,pathname,Object.fromEntries(new FormData(form).entries()),
    crypto.randomUUID());
   location.reload();
  }catch(err){error.textContent=err.message||'Could not save your character.';}
 });
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.stopPropagation();hide();}
 });
 return {show,hide,isOpen:()=>!root.hidden};
}
