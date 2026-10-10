import {useCallback,useEffect,useRef,useState} from 'react';
import {createUserWithEmailAndPassword,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signOut,type User} from 'firebase/auth';
import App from './App';
import {auth} from './firebase';
import {legacyAvailable,loadWorkspace,saveHub,saveVault,type Workspace} from './cloud';
import {load,type Vault} from './data';
import {loadLegacyHub,type Hub} from './PersonalHub';
import './cloud.css';

const friendly=(error:unknown)=>{const text=error instanceof Error?error.message:String(error);return text.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?/,'').replace(/^FirebaseError:\s*/,'')};
const mergeById=<T extends {id:string}>(cloud:T[],local:T[])=>{const ids=new Set(cloud.map(x=>x.id));return [...cloud,...local.filter(x=>!ids.has(x.id))]};

export default function CloudGate(){
 const [user,setUser]=useState<User|null|undefined>(undefined);
 const [workspace,setWorkspace]=useState<Workspace|null>(null);
 const [migration,setMigration]=useState(false);
 const [error,setError]=useState('');
 const [sync,setSync]=useState<'saved'|'saving'|'error'>('saved');
 const savedVault=useRef<Vault|null>(null),savedHub=useRef<Hub|null>(null);
 const vaultTail=useRef(Promise.resolve()),hubTail=useRef(Promise.resolve());
 const latestVault=useRef<Vault|null>(null),latestHub=useRef<Hub|null>(null);
 const pending=useRef(0);
 useEffect(()=>onAuthStateChanged(auth,async next=>{
  setUser(next);setWorkspace(null);setError('');setMigration(false);
  if(!next)return;
  try{const data=await loadWorkspace(next.uid);savedVault.current=data.vault;savedHub.current=data.hub;latestVault.current=data.vault;latestHub.current=data.hub;setWorkspace(data);setMigration(legacyAvailable()&&localStorage.getItem(`pg-migration-reviewed-${next.uid}`)!=='yes')}
  catch(e){setError(`Could not load your Firebase workspace: ${friendly(e)}`)}
 }),[]);
 const onVaultChange=useCallback((next:Vault)=>{
  if(!user||!savedVault.current)return;
  latestVault.current=next;pending.current++;setSync('saving');
  vaultTail.current=vaultTail.current.then(async()=>{const prior=savedVault.current!;await saveVault(user.uid,prior,next);savedVault.current=next;pending.current--;if(pending.current===0)setSync('saved')}).catch(e=>{pending.current--;setError(`Could not save project data: ${friendly(e)}`);setSync('error')});
 },[user]);
 const onHubChange=useCallback((next:Hub)=>{
  if(!user||!savedHub.current)return;
  latestHub.current=next;pending.current++;setSync('saving');
  hubTail.current=hubTail.current.then(async()=>{const prior=savedHub.current!;await saveHub(user.uid,prior,next);savedHub.current=next;pending.current--;if(pending.current===0)setSync('saved')}).catch(e=>{pending.current--;setError(`Could not save personal data: ${friendly(e)}`);setSync('error')});
 },[user]);
 async function importBrowser(){
  if(!user||!workspace)return;
  try{setSync('saving');const localVault=localStorage.getItem('project-graveyard-v1')?load():null;const localHub=localStorage.getItem('project-graveyard-personal-v1')?loadLegacyHub():null;
   const vault:Vault=localVault?{...workspace.vault,projects:mergeById(workspace.vault.projects,localVault.projects),events:mergeById(workspace.vault.events,localVault.events),wins:mergeById(workspace.vault.wins,localVault.wins),displayName:workspace.vault.displayName==='Maker'?localVault.displayName:workspace.vault.displayName}:workspace.vault;
   const hub:Hub=localHub?{...workspace.hub,tasks:mergeById(workspace.hub.tasks,localHub.tasks),ideas:mergeById(workspace.hub.ideas,localHub.ideas),focus:workspace.hub.focus.sessions?workspace.hub.focus:localHub.focus}:workspace.hub;
   await saveVault(user.uid,workspace.vault,vault);await saveHub(user.uid,workspace.hub,hub);
   savedVault.current=vault;savedHub.current=hub;latestVault.current=vault;latestHub.current=hub;localStorage.setItem(`pg-migration-reviewed-${user.uid}`,'yes');setWorkspace({vault,hub});setMigration(false);setSync('saved');
  }catch(e){setError(`Import failed; your browser copy is unchanged: ${friendly(e)}`);setSync('error')}
 }
 async function leave(){await Promise.all([vaultTail.current,hubTail.current]);await signOut(auth)}
 if(user===undefined)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><h1>Opening your vault…</h1></div></div>;
 if(!user)return <AuthScreen/>;
 if(!workspace)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><h1>Loading your workspace…</h1>{error&&<p role="alert">{error}</p>}<button className="secondary" onClick={()=>signOut(auth)}>Sign out</button></div></div>;
 if(migration)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><span className="eyebrow">ONE-TIME TRANSFER</span><h1>Bring your old work with you?</h1><p>This browser has Project Graveyard data. Import copies projects, tasks, ideas, and wins to your private Firebase account. Cloud records with the same IDs stay unchanged. Your browser copy remains untouched.</p>{error&&<p role="alert" className="cloud-error">{error}</p>}<div className="cloud-actions"><button className="primary" onClick={importBrowser} disabled={sync==='saving'}>Import browser data</button><button className="secondary" onClick={()=>{localStorage.setItem(`pg-migration-reviewed-${user.uid}`,'yes');setMigration(false)}}>Start with cloud data</button></div></div></div>;
 return <><div className="cloud-account"><span>{sync==='saving'?'Saving to Firebase…':sync==='error'?'Sync needs attention':'● Firebase synced'}</span><strong>{user.email}</strong>{sync==='error'&&<button onClick={()=>{if(latestVault.current)onVaultChange(latestVault.current);if(latestHub.current)onHubChange(latestHub.current)}}>Retry save</button>}<button onClick={leave}>Sign out</button></div>{error&&<div className="cloud-alert" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}<App initialVault={workspace.vault} initialHub={workspace.hub} onVaultChange={onVaultChange} onHubChange={onHubChange}/></>;
}

function AuthScreen(){const [mode,setMode]=useState<'signin'|'signup'>('signin');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{if(mode==='signin')await signInWithEmailAndPassword(auth,email,password);else await createUserWithEmailAndPassword(auth,email,password)}catch(err){setMessage(friendly(err))}finally{setBusy(false)}}async function reset(){if(!email.trim()){setMessage('Enter your email first.');return}setBusy(true);try{await sendPasswordResetEmail(auth,email);setMessage('If this account exists, a reset email is on its way.')}catch(err){setMessage(friendly(err))}finally{setBusy(false)}}return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><span className="eyebrow">PROJECT GRAVEYARD / PRIVATE CLOUD</span><h1>{mode==='signin'?'Welcome back.':'Give your ideas a home.'}</h1><p>Sign in to keep your projects, personal tasks, ideas, and focus progress in sync across devices.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} autoComplete={mode==='signin'?'current-password':'new-password'}/></label><button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signin'?'Sign in':'Create account'}</button></form>{message&&<p className="cloud-error" role="status">{message}</p>}<div className="cloud-links"><button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode==='signin'?'Create an account':'Already have an account? Sign in'}</button><button onClick={reset} disabled={busy}>Forgot password?</button></div><small>Each account has a separate Firestore workspace. No sample projects are added to your data.</small></div></div>}
