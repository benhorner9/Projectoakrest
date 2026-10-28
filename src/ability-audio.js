/**
 * Small original, synthesised sound identities for Oakrest's tribrid abilities.
 * Pure presentation data: does not influence hit rolls or gameplay timing.
 * Positive exponential frequency sweeps are safe on WebAudio across Safari.
 */
export function abilitySoundProfile(style='melee',kind='hit',family='sword',effect=null){
 const magic=style==='magic',ranged=style==='ranged';
 const ember=family==='ember',heavy=family==='greatsword'||family==='crossbow';
 const base=magic?
   (ember?{wave:'sawtooth',hz:360,sweep:1.58,seconds:.27,gain:.034}:{wave:'sine',hz:640,sweep:.62,seconds:.29,gain:.042}):
   ranged?{wave:'triangle',hz:heavy?180:290,sweep:.57,seconds:heavy?.29:.17,gain:.051}:
   {wave:'triangle',hz:heavy?116:family==='daggers'?260:190,sweep:.46,seconds:heavy?.31:.2,gain:.06};
 const effects={
  sweep:{wave:'sawtooth',hz:240,sweep:.48,seconds:.32,gain:.049},
  execute:{wave:'triangle',hz:118,sweep:.31,seconds:.38,gain:.065},
  burst:{wave:'triangle',hz:410,sweep:.43,seconds:.23,gain:.047},
  nova:{wave:'sine',hz:770,sweep:.24,seconds:.43,gain:.05},
  shield:{wave:'sine',hz:320,sweep:1.61,seconds:.36,gain:.044},
  heal:{wave:'sine',hz:600,sweep:1.46,seconds:.43,gain:.035},
  dash:{wave:'triangle',hz:280,sweep:1.65,seconds:.13,gain:.039},
  dashback:{wave:'triangle',hz:260,sweep:.53,seconds:.17,gain:.039},
  retreat:{wave:'triangle',hz:310,sweep:.38,seconds:.25,gain:.043}
 };
 // Offensive magic distinguishes Ember and Frost even when the ability
 // kind is shared. Defensive utility shares stable sounds across styles.
 const cue=effect==='heavy-slash'?{...base,hz:heavy?96:142,seconds:.32,sweep:.34}:effect==='piercing-arrow'?{...base,hz:360,seconds:.24,sweep:.35}:effects[kind];
 return {...base,...(cue||{}),wave:cue?.wave||base.wave};
}
