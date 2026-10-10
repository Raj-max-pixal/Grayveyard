import {collection,deleteDoc,doc,getDoc,getDocs,setDoc,writeBatch,type DocumentData,type DocumentReference} from 'firebase/firestore';
import {db} from './firebase';
import {emptyVault,type Event,type Project,type Vault} from './data';
import {emptyHub,type Hub,type Idea,type PersonalTask} from './PersonalHub';

export type Workspace={vault:Vault;hub:Hub};
const base=(uid:string)=>`users/${uid}`;
const entry=(uid:string,name:string,id:string)=>doc(db,base(uid),name,id);
const list=async <T,>(uid:string,name:string):Promise<T[]>=>{
 const snap=await getDocs(collection(db,base(uid),name));
 return snap.docs.map(x=>x.data() as T);
};

export async function loadWorkspace(uid:string,fallbackName='Maker'):Promise<Workspace>{
 const [projects,events,wins,tasks,ideas,profile,focus]=await Promise.all([
  list<Project>(uid,'projects'),list<Event>(uid,'events'),list<Vault['wins'][number]>(uid,'wins'),
  list<PersonalTask>(uid,'personalTasks'),list<Idea>(uid,'ideas'),
  getDoc(entry(uid,'meta','profile')),getDoc(entry(uid,'meta','focus'))
 ]);
 const vault={...emptyVault(),projects,events:events.sort((a,b)=>b.timestamp.localeCompare(a.timestamp)),wins:wins.sort((a,b)=>b.timestamp.localeCompare(a.timestamp)),displayName:profile.exists()&&typeof profile.data().displayName==='string'?profile.data().displayName:fallbackName};
 const hub:Hub={...emptyHub,tasks,ideas,focus:focus.exists()?{...emptyHub.focus,...focus.data()}:emptyHub.focus};
 return {vault,hub};
}

type Item={id:string};
function changes<T extends Item>(uid:string,name:string,before:T[],after:T[]){
 const old=new Map(before.map(x=>[x.id,x]));
 const next=new Map(after.map(x=>[x.id,x]));
 const result:{kind:'set'|'delete';ref:DocumentReference<DocumentData,DocumentData>;value?:T}[]=[];
 for(const item of after){if(JSON.stringify(old.get(item.id))!==JSON.stringify(item))result.push({kind:'set',ref:entry(uid,name,item.id),value:item})}
 for(const item of before){if(!next.has(item.id))result.push({kind:'delete',ref:entry(uid,name,item.id)})}
 return result;
}
async function applyChanges(ops:ReturnType<typeof changes<Item>>){
 for(let i=0;i<ops.length;i+=400){const batch=writeBatch(db);for(const op of ops.slice(i,i+400)){if(op.kind==='delete')batch.delete(op.ref);else batch.set(op.ref,op.value!)}await batch.commit()}
}

export async function saveVault(uid:string,before:Vault,after:Vault){
 const ops=[...changes(uid,'projects',before.projects,after.projects),...changes(uid,'events',before.events,after.events),...changes(uid,'wins',before.wins,after.wins)];
 await applyChanges(ops);
 if(before.displayName!==after.displayName)await setDoc(entry(uid,'meta','profile'),{displayName:after.displayName});
}
export async function saveHub(uid:string,before:Hub,after:Hub){
 const ops=[...changes(uid,'personalTasks',before.tasks,after.tasks),...changes(uid,'ideas',before.ideas,after.ideas)];
 await applyChanges(ops);
 if(JSON.stringify(before.focus)!==JSON.stringify(after.focus))await setDoc(entry(uid,'meta','focus'),after.focus);
}

// Kept separate from browser data so importing can never silently replace cloud records.
export function legacyAvailable(){return Boolean(localStorage.getItem('project-graveyard-v1')||localStorage.getItem('project-graveyard-personal-v1'))}
export async function verifyCloudWrite(uid:string){const ref=entry(uid,'meta','connection');await setDoc(ref,{checkedAt:new Date().toISOString()});await deleteDoc(ref)}
