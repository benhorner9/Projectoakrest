import {LOADOUTS,ARMOUR,STYLE_ORDER,levelFromXp} from './rules.js';
import {SHOP_STOCK,TOWN_MATERIALS,STARTER_GROVE_XP_CAP,townInteraction,townBank,bankCoins,bankMaterials,bankEquipment,buyStarterStock,teachWoodcutting,harvestStarterGrove} from './town-services.js';

/** One accessible overlay for all town services, without server/API dependencies. */
export function setupTownUI({getData,getTime,onChange,onEquipmentChange,notify,onOpen}){
  const $=id=>document.getElementById(id);
  const panel=$('town-panel'),prompt=$('town-interact'),body=$('town-content');
  const node=(tag,value,parent,cls)=>{
    const e=document.createElement(tag);if(value!==null)e.textContent=value;
    if(cls)e.className=cls;if(parent)parent.append(e);return e;
  };
  const button=(parent,label,fn,disabled=false)=>{
    const b=node('button',label,parent);b.type='button';b.disabled=disabled;b.addEventListener('click',fn);return b;
  };
  const row=(title,subtitle)=>{
    const wrapper=node('div',null,body,'town-row'),left=node('div',null,wrapper);
    node('strong',title,left);if(subtitle)node('small',subtitle,left);
    return node('div',null,wrapper,'town-actions');
  };
  const caps=id=>id.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
  const cooldowns=new Map();let service=null,lastPosition=null;
  function close(){panel.hidden=true;service=null;}
  $('town-close').addEventListener('click',close);
  function changed(message,equipment=false){
    onChange();
    if(equipment)onEquipmentChange();
    if(message)notify(message);
    render();
  }
  function render(){
    if(!service||panel.hidden)return;
    const data=getData();body.replaceChildren();$('town-title').textContent=service.label;
    if(service.id==='bank'){
      const bank=townBank(data);
      node('p','Bank storage is saved with this character. Transfer complete coin or material stacks, and store spare equipment.',body);
      let actions=row('Coins','On you: '+data.coins+' · Vault: '+bank.coins);
      button(actions,'DEPOSIT',()=>{const a=bankCoins(data,'deposit');if(a)changed('Deposited '+a+' coins');},data.coins<=0);
      button(actions,'WITHDRAW',()=>{const a=bankCoins(data,'withdraw');if(a)changed('Withdrew '+a+' coins');},bank.coins<=0);
      node('h3','Materials',body);
      for(const id of TOWN_MATERIALS){
        actions=row(caps(id),'Bag: '+(data.inventory.materials[id]||0)+' · Vault: '+(bank.materials[id]||0));
        button(actions,'STORE',()=>{const a=bankMaterials(data,id,'deposit');if(a)changed('Stored '+a+' '+caps(id));},!(data.inventory.materials[id]>0));
        button(actions,'TAKE',()=>{const a=bankMaterials(data,id,'withdraw');if(a)changed('Withdrew '+a+' '+caps(id));},!(bank.materials[id]>0));
      }
      node('h3','Weapons and armour',body);
      for(const style of STYLE_ORDER)for(const id of [...new Set([...data.inventory.weapons[style],...bank.weapons[style]])]){
        const bagged=data.inventory.weapons[style].includes(id);
        actions=row(LOADOUTS[style]?.[id]?.title||id,style.toUpperCase()+' · '+(bagged?'Bag':'Vault'));
        button(actions,bagged?'STORE':'TAKE',()=>{
          if(bankEquipment(data,'weapon',id,bagged?'deposit':'withdraw',style))changed('Equipment transferred',true);
          else notify('Unequip this weapon before banking');
        },bagged&&data.gear[style]===id);
      }
      for(const id of [...new Set([...data.inventory.armour,...bank.armour])]){
        const bagged=data.inventory.armour.includes(id);
        actions=row(ARMOUR[id]?.title||id,bagged?'Bag':'Vault');
        button(actions,bagged?'STORE':'TAKE',()=>{
          if(bankEquipment(data,'armour',id,bagged?'deposit':'withdraw'))changed('Armour transferred',true);
          else notify('Unequip armour in every style before banking');
        },bagged&&Object.values(data.armour).includes(id));
      }
    }else if(service.id==='store'){
      node('p','Basic equipment for local adventurers. More powerful weapons and profession supplies belong to other settlements.',body);
      node('p','Coins on you: '+data.coins,body);
      const bank=townBank(data);
      for(const stock of SHOP_STOCK){
        const bagged=stock.kind==='weapon'?data.inventory.weapons[stock.style].includes(stock.itemId):data.inventory.armour.includes(stock.itemId);
        const banked=stock.kind==='weapon'?bank.weapons[stock.style].includes(stock.itemId):bank.armour.includes(stock.itemId);
        const actions=row(stock.label,stock.price+' coins · '+(bagged?'Owned':banked?'Banked':'Available'));
        button(actions,bagged?'OWNED':banked?'BANKED':'BUY',()=>{
          const result=buyStarterStock(data,stock.id);
          if(result.ok)changed('Purchased '+stock.label,true);else notify(result.reason);
        },bagged||banked||data.coins<stock.price);
      }
    }else if(service.id==='forester'){
      const level=levelFromXp(data.professions?.woodcuttingXp||0).level;
      node('p','The Forester’s Lodge teaches beginner Woodcutting only. Hunting, Mining, Blacksmithing and Inscription will have their own locations.',body);
      node('h3','Woodcutting — Level '+level,body);
      node('p',(data.professions?.woodcuttingXp||0)+' / '+STARTER_GROVE_XP_CAP+' starter XP. Practice on three training pines north of the town plaza and bank your softwood logs.',body);
      const learned=data.professions?.woodcuttingLearned===true;
      const actions=row('Forester lesson',learned?'Already learned':'Free beginner training');
      button(actions,learned?'LEARNED':'LEARN WOODCUTTING',()=>{if(teachWoodcutting(data))changed('Learned Woodcutting. Find the pines north of the plaza.');},learned);
      if(level>=5)node('p','You have outgrown these trees. Higher-level forestry requires travelling to other regions.',body,'town-notice');
    }
  }
  function interact({x,z,allowed,time}){
    if(!allowed||!panel.hidden)return false;
    const candidate=townInteraction(x,z);if(!candidate)return false;
    if(candidate.type==='grove'){
      const result=harvestStarterGrove(getData(),candidate.id,time,cooldowns);
      if(result.ok){onChange();notify('Woodcutting +35 XP · Softwood logs +1');}
      else notify(result.reason);
      return true;
    }
    service=candidate;panel.hidden=false;onOpen();render();return true;
  }
  function update({x,z,allowed}){
    lastPosition={x,z};
    const target=allowed&&panel.hidden?townInteraction(x,z):null;
    prompt.hidden=!target;
    if(target){
      $('town-interact-description').textContent=target.label+(target.type==='grove'?' · '+(getData().professions?.woodcuttingLearned?'Collect logs':'Woodcutting lesson needed'):' · Town service');
      $('town-interact-button').textContent=target.type==='grove'?'CUT WOOD':'INTERACT · T';
    }
  }
  $('town-interact-button').addEventListener('click',()=>{
    if(lastPosition)interact({...lastPosition,allowed:true,time:getTime()});
  });
  return {interact,update,close,isOpen:()=>!panel.hidden};
}
