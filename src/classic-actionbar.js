/** Eight real action buttons. The first four are the weapon-family ability
 * slots already persisted by Oakrest; the remaining four are real supply /
 * movement / attack actions. All equip and cooldown rules remain in combat.
 */
import {bindClassicPress} from './classic-touch-press.js';

const MARK=Object.freeze({
 hit:'⚔',sweep:'✶',shield:'⬡',dash:'➟',dashback:'↶',bolt:'✦',
 burst:'≋',root:'⟡',nova:'❄',heal:'✚',execute:'✹',retreat:'➶',
 basic:'⚔',other:'✧'
});
const STYLE_MARK=Object.freeze({melee:'⚔',ranged:'➶',magic:'✧'});
export function setupClassicActionBar({doc=document,combat,consume,feedback=()=>{}}){
 const $=id=>doc.getElementById(id);
 const deck=$('oakrest-action-deck');
 if(!deck)return {update(){},activate(){}};
 const buttons=[...doc.querySelectorAll('[data-ability]')];
 const styles=$('classic-styles');
 const heading=doc.createElement('div');heading.className='oakrest-action-heading';
 const title=doc.createElement('strong');title.className='oakrest-action-title';heading.append(title);
 const instructions=doc.createElement('span');instructions.className='oakrest-action-hint';
 instructions.textContent='1–8 · actions  ·  Tab · switch style';
 heading.append(instructions);
 deck.insertBefore(heading,deck.firstChild);
 const kinds=[...buttons.map((_,index)=>'ability'+index),'eat','drink','dodge','attack'];
 const utilityBtns=[$('oakrest-food-slot'),$('oakrest-potion-slot'),$('classic-dodge'),$('classic-attack')];
 const all=[...buttons,...utilityBtns];
 // Appearance only: input handling, combat authority and persisted
 // equipped abilities remain unchanged. Each icon is a reusable SVG sprite.
 const iconByKind={hit:'slash',sweep:'sweep',shield:'shield',dash:'dash',
  dashback:'retreat',bolt:'bolt',burst:'burst',root:'root',nova:'nova',
  heal:'heal',execute:'execute',retreat:'retreat',basic:'melee',other:'strike'};
 const spriteBase='./src/oakrest-ui-icons.svg#';
 const setTitle=(element,main,sub,description,iconName='empty')=>{
  if(!element)return;
  let icon=element.querySelector(':scope > svg.oakrest-action-icon');
  if(!icon){
   // Remove only the old decorative Unicode icon; the existing button,
   // listeners, small label and gameplay activation remain intact.
   for(const child of element.childNodes)if(child.nodeType===3)child.textContent='';
   icon=doc.createElementNS('http://www.w3.org/2000/svg','svg');
   icon.setAttribute('viewBox','0 0 32 32');
   icon.setAttribute('fill','none');
   icon.setAttribute('stroke','currentColor');
   icon.setAttribute('stroke-width','1.9');
   icon.setAttribute('stroke-linecap','round');
   icon.setAttribute('stroke-linejoin','round');
   icon.setAttribute('aria-hidden','true');
   icon.classList.add('oakrest-action-icon');
   const ref=doc.createElementNS('http://www.w3.org/2000/svg','use');
   icon.append(ref);element.prepend(icon);
  }
  const target=spriteBase+iconName;
  // Older WebKit may expose SVG firstElementChild late even after append.
  // Reuse or recreate the <use> safely; a missing sprite must never prevent
  // world initialization, movement, inventory or character creation.
  let ref=icon.querySelector('use');
  if(!ref){
   ref=doc.createElementNS('http://www.w3.org/2000/svg','use');
   icon.append(ref);
  }
  if(ref.getAttribute('href')!==target)ref.setAttribute('href',target);
  const small=element.querySelector('small');if(small)small.textContent=sub;
  element.title=description;
  element.setAttribute('aria-label',description);
 };
 const use=index=>{
  if(index<0||index>7)return false;
  if(index<4){
   if(all[index].disabled){feedback('Ability unavailable or on cooldown.');return false;}
   all[index].click();return true;
  }
  if(index===4||index===5){
   if(all[index].disabled){feedback(index===4?'No rations available or Health is full.':'No woodland tonic available or Health is full.');return false;}
   const action=index===4?'eat':'drink';
   return consume(action);
  }
  if(all[index].disabled)return false;
  all[index].click();return true;
 };
 bindClassicPress(utilityBtns[0],()=>{consume('eat');});
 bindClassicPress(utilityBtns[1],()=>{consume('drink');});
 const first=doc.querySelector('.classic-ability-buttons');
 first.setAttribute('aria-label','Four equipped abilities for the current combat style');
 for(let i=0;i<4;i++)all[i].dataset.hotbarSlot=String(i+1);
 for(let i=4;i<8;i++)all[i].dataset.hotbarSlot=String(i+1);
 function update(snapshot){
  if(!snapshot)return;
  const style=snapshot.style||'melee';
  title.textContent=STYLE_MARK[style]+' '+style.toUpperCase()+' · EQUIPPED ACTIONS';
  deck.dataset.combatStyle=style;
  for(let i=0;i<4;i++){
   const btn=buttons[i],ability=snapshot.abilities?.[i];
   const seconds=ability?Math.max(0,(ability.cooldownEnd||0)-snapshot.time):0;
   setTitle(btn,ability?MARK[ability.kind]||'✧':'◇',seconds>0?seconds.toFixed(1)+'s':' '+(i+1),
    ability?style.toUpperCase()+' · '+ability.name+(seconds>0?' · '+seconds.toFixed(1)+' seconds cooldown':''):
     'Empty '+style+' ability slot '+(i+1)+' · set in Abilities',
    ability?iconByKind[ability.kind]||style:'empty');
   btn.dataset.abilityKind=ability?.kind||'empty';
   btn.dataset.combatStyle=style;
   btn.classList.toggle('is-empty',!ability);
   btn.classList.toggle('on-cooldown',seconds>0);
  }
  const mats=combat.sandboxSave()?.inventory?.materials||{};
  const food=Math.max(0,Math.floor(mats.ration||0)),tonic=Math.max(0,Math.floor(mats['woodland-tonic']||0));
  const available=snapshot.hp>0&&snapshot.hp<snapshot.maxHp;
  const meal=utilityBtns[0],drink=utilityBtns[1];
  setTitle(meal,'♨',food?'×'+food:'FOOD','Field ration · heals 35 Health · '+food+' available','ration');
  setTitle(drink,'✚',tonic?'×'+tonic:'TONIC','Woodland tonic · heals 20 Health · '+tonic+' available','tonic');
  meal.disabled=!available||food===0;drink.disabled=!available||tonic===0;
  setTitle(utilityBtns[2],'↶','DODGE','Dodge · avoid incoming attack','dodge');
  setTitle(utilityBtns[3],'⚔','ATTACK','Attack selected or nearest enemy','strike');
 }
 const styleHead=doc.createElement('div');styleHead.className='oakrest-combat-stance';
 deck.insertBefore(styleHead,deck.querySelector('.classic-action-footer'));
 styleHead.append(styles);
 return {update,activate:use,slots:()=>kinds.slice()};
}
