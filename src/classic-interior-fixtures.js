/** Canonical local-space furnishings: renderer and navigation must use these same footprints. */
export function interiorFixtures(building){
 const {w,d,kind}=building;
 const shelf={id:'back-shelves',x:0,z:-d/2+.65,w:w*.65,d:.75,h:2.65,material:'darkwood'};
 if(kind==='bank')return [
  {id:'teller-counter',x:0,z:-d*.12,w:w*.68,d:1.15,h:1.6,material:'trim'},
  shelf,
  {id:'bank-safe',x:w*.38,z:-d*.30,w:1.2,d:1.3,h:1.75,material:'stone'}
 ];
 if(kind==='store'||kind==='trade')return [
  {id:'shop-counter',x:-w*.20,z:-d*.12,w:w*.45,d:1.3,h:1.5,material:'trim'},
  shelf,
  {id:'supply-crates',x:w*.33,z:-d*.28,w:1.3,d:1.45,h:1.1,material:'wood'}
 ];
 return [
  {id:'worktable',x:-w*.25,z:-d*.2,w:2,d:1.4,h:1.1,material:'darkwood'},
  {id:'wall-storage',x:w*.23,z:-d*.2,w:.8,d:.85,h:1.6,material:'trim'},
  shelf,
  {id:'bed',x:w/2-1.25,z:-d/2+2.1,w:1.6,d:2.3,h:.95,material:'darkwood'}
 ];
}
export const insideFixture=(p,f,r=.38)=>
 Math.abs(p.x-f.x)<f.w/2+r&&Math.abs(p.z-f.z)<f.d/2+r;
