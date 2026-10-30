/** Oakrest chat foundation. Local session log only: never pretends that
 * public / party / clan or private chat is connected to a multiplayer server.
 * Can be connected to a real transport later through receive().
 */
export const CHAT_CHANNELS=Object.freeze(['All','Game','Public','Private','Party','Clan','Trade']);
const MAX_MESSAGES=160;
export function setupClassicChat(doc=document){
 const host=doc.getElementById('oakrest-chat');
 if(!host)return {record(){},focus(){},entries:()=>[],receive(){}};
 const el=(tag,cls,text,parent)=>{
  const n=doc.createElement(tag);if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  (parent||host).append(n);return n;
 };
 const nav=el('nav','oakrest-chat-channels',undefined,host);
 nav.setAttribute('aria-label','Chat channels');
 const log=el('div','oakrest-chat-log',undefined,host);
 log.id='oakrest-chat-log';log.setAttribute('role','log');
 log.setAttribute('aria-label','Chat history');log.setAttribute('aria-live','polite');
 const form=el('form','oakrest-chat-compose',undefined,host);
 const label=el('label','oakrest-chat-label','CHAT',form);
 const input=el('input','oakrest-chat-input',undefined,form);
 input.id='oakrest-chat-input';label.htmlFor=input.id;input.type='text';
 input.maxLength=280;input.autocomplete='off';input.spellcheck=true;
 input.placeholder='Press Enter to write a local message…';
 const send=el('button','oakrest-chat-send','SEND',form);
 send.type='submit';
 // Connection status is stated in the input and Social panel, not a stray footer.
 let channel='All',messageSequence=0;
 const messages=[];
 function availableForMessage(entry){
  return channel==='All'||channel===entry.channel;
 }
 const nodeFor=entry=>{
  const row=el('div','oakrest-chat-line',undefined,log);
  row.dataset.channel=entry.channel.toLowerCase();
  const clock=el('time','oakrest-chat-time',entry.clock,row);
  clock.dateTime=entry.iso;
  el('span','oakrest-chat-channel','['+entry.channel+']',row);
  if(entry.author)el('b','oakrest-chat-author',entry.author+':',row);
  el('span','oakrest-chat-text',entry.text,row);
  return row;
 };
 function render(){
  log.replaceChildren();
  for(const entry of messages.filter(availableForMessage).slice(-75))nodeFor(entry);
  log.scrollTop=log.scrollHeight;
  for(const button of nav.querySelectorAll('button')){
   const active=button.dataset.channel===channel;
   button.classList.toggle('active',active);
   button.setAttribute('aria-pressed',String(active));
  }
  const offline=!['All','Game'].includes(channel);
  input.disabled=offline||channel==='Game';send.disabled=input.disabled;
  input.placeholder=offline?channel+' chat is not connected yet':
   channel==='Game'?'Game events are read-only':'Write a local message (not broadcast)…';
 }
 function record(value,type='Game',author=''){
  if(!CHAT_CHANNELS.includes(type)&&type!=='Local')type='Game';
  const text=String(value??'').trim().slice(0,280);
  if(!text)return false;
  const now=new Date();
  messages.push({id:++messageSequence,channel:type,text,author:String(author||'').slice(0,40),
   clock:now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
   iso:now.toISOString()});
  while(messages.length>MAX_MESSAGES)messages.shift();
  if(availableForMessage(messages[messages.length-1]))render();
  return true;
 }
 const buttons={};
 for(const name of CHAT_CHANNELS){
  const button=el('button','oakrest-chat-channel-button',name,nav);
  button.type='button';button.dataset.channel=name;
  button.addEventListener('click',()=>{channel=name;render();});
  buttons[name]=button;
 }
 form.addEventListener('submit',e=>{
  e.preventDefault();
  if(channel!=='All')return;
  const value=input.value.trim();if(!value)return;
  record(value,'Local','You');input.value='';
 });
 input.addEventListener('keydown',e=>e.stopPropagation());
 record('You have entered Oakrest.','Game');
 record('Public, Private, Party, Clan and Trade chat are not connected yet.','Game');
 render();
 return {
  record,receive:(text,networkChannel,author)=>{
   // A future authenticated transport must explicitly invoke this API.
   if(!CHAT_CHANNELS.includes(networkChannel)||networkChannel==='All'||networkChannel==='Game')return false;
   return record(text,networkChannel,author);
  },
  focus:()=>{buttons.All.click();input.focus();},
  entries:()=>messages.map(entry=>({...entry})),
  active:()=>channel
 };
}
