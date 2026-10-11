import {useCallback,useEffect,useRef,useState} from 'react';
import {createUserWithEmailAndPassword,GoogleAuthProvider,getIdTokenResult,onAuthStateChanged,sendPasswordResetEmail,signInWithEmailAndPassword,signInWithPopup,signOut,type User} from 'firebase/auth';
import App from './App';
import {auth} from './firebase';
import {legacyAvailable,loadWorkspace,saveHub,saveVault,type Workspace} from './cloud';
import {load,type Vault} from './data';
import {loadLegacyHub,type Hub} from './PersonalHub';
import GuestPreview from './GuestPreview';
import './cloud.css';

const friendly=(error:unknown)=>{const text=error instanceof Error?error.message:String(error);return text.replace(/^Firebase:\s*/,'').replace(/\s*\(auth\/[^)]+\)\.?/,'').replace(/^FirebaseError:\s*/,'')};
const mergeById=<T extends {id:string}>(cloud:T[],local:T[])=>{const ids=new Set(cloud.map(x=>x.id));return [...cloud,...local.filter(x=>!ids.has(x.id))]};

export default function CloudGate(){
 const [user,setUser]=useState<User|null|undefined>(undefined);
 const [isAdmin,setIsAdmin]=useState(false);
 const [workspace,setWorkspace]=useState<Workspace|null>(null);
 const [migration,setMigration]=useState(false);
 const [error,setError]=useState('');
 const [sync,setSync]=useState<'saved'|'saving'|'error'>('saved');
 const savedVault=useRef<Vault|null>(null),savedHub=useRef<Hub|null>(null);
 const vaultTail=useRef(Promise.resolve()),hubTail=useRef(Promise.resolve());
 const latestVault=useRef<Vault|null>(null),latestHub=useRef<Hub|null>(null);
 const pending=useRef(0);
 useEffect(()=>onAuthStateChanged(auth,async next=>{
  setUser(next);setWorkspace(null);setError('');setMigration(false);setIsAdmin(false);
  if(!next)return;
  try{const [data,token]=await Promise.all([loadWorkspace(next.uid,next.displayName||'Maker'),getIdTokenResult(next)]);setIsAdmin(token.claims.admin===true);savedVault.current=data.vault;savedHub.current=data.hub;latestVault.current=data.vault;latestHub.current=data.hub;setWorkspace(data);setMigration(legacyAvailable()&&localStorage.getItem(`pg-migration-reviewed-${next.uid}`)!=='yes')}
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
   const vault:Vault=localVault?{...workspace.vault,projects:mergeById(workspace.vault.projects,localVault.projects),events:mergeById(workspace.vault.events,localVault.events),wins:mergeById(workspace.vault.wins,localVault.wins),planner:mergeById(workspace.vault.planner,localVault.planner),displayName:workspace.vault.displayName==='Maker'?localVault.displayName:workspace.vault.displayName}:workspace.vault;
   const hub:Hub=localHub?{...workspace.hub,tasks:mergeById(workspace.hub.tasks,localHub.tasks),ideas:mergeById(workspace.hub.ideas,localHub.ideas),focus:workspace.hub.focus.sessions?workspace.hub.focus:localHub.focus}:workspace.hub;
   await saveVault(user.uid,workspace.vault,vault);await saveHub(user.uid,workspace.hub,hub);
   savedVault.current=vault;savedHub.current=hub;latestVault.current=vault;latestHub.current=hub;localStorage.setItem(`pg-migration-reviewed-${user.uid}`,'yes');setWorkspace({vault,hub});setMigration(false);setSync('saved');
  }catch(e){setError(`Import failed; your browser copy is unchanged: ${friendly(e)}`);setSync('error')}
 }
 async function leave(){await Promise.all([vaultTail.current,hubTail.current]);await signOut(auth)}
 if(user===undefined)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><h1>Opening your vault…</h1></div></div>;
 if(!user)return <GuestGate/>;
 if(!workspace)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><h1>Loading your workspace…</h1>{error&&<p role="alert">{error}</p>}<button className="secondary" onClick={()=>signOut(auth)}>Sign out</button></div></div>;
 if(migration)return <div className="cloud-screen"><div className="cloud-card"><span className="cloud-mark">✦</span><span className="eyebrow">ONE-TIME TRANSFER</span><h1>Bring your old work with you?</h1><p>This browser has Project Graveyard data. Import copies projects, tasks, ideas, and wins to your private Firebase account. Cloud records with the same IDs stay unchanged. Your browser copy remains untouched.</p>{error&&<p role="alert" className="cloud-error">{error}</p>}<div className="cloud-actions"><button className="primary" onClick={importBrowser} disabled={sync==='saving'}>Import browser data</button><button className="secondary" onClick={()=>{localStorage.setItem(`pg-migration-reviewed-${user.uid}`,'yes');setMigration(false)}}>Start with cloud data</button></div></div></div>;
 return <><div className="cloud-account"><span>{sync==='saving'?'Saving to Firebase…':sync==='error'?'Sync needs attention':'● Firebase synced'}</span><strong>{user.email}</strong>{sync==='error'&&<button onClick={()=>{if(latestVault.current)onVaultChange(latestVault.current);if(latestHub.current)onHubChange(latestHub.current)}}>Retry save</button>}<button onClick={leave}>Sign out</button></div>{error&&<div className="cloud-alert" role="alert">{error}<button onClick={()=>setError('')}>Dismiss</button></div>}<App initialVault={workspace.vault} initialHub={workspace.hub} onVaultChange={onVaultChange} onHubChange={onHubChange} user={user} isAdmin={isAdmin} onSignOut={leave}/></>;
}

function GuestGate(){
 const [prompted,setPrompted]=useState(false);const [showLogin,setShowLogin]=useState(false);
 useEffect(()=>{if(prompted)return;const timer=window.setTimeout(()=>{setPrompted(true);setShowLogin(true)},10000);return()=>window.clearTimeout(timer)},[prompted]);
 useEffect(()=>{if(!showLogin)return;const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setShowLogin(false)};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[showLogin]);
 const requestLogin=()=>{setPrompted(true);setShowLogin(true)};
 return <><GuestPreview onLogin={requestLogin}/>{showLogin&&<AuthScreen onClose={()=>setShowLogin(false)}/>}</>
}

function AuthScreen({onClose}:{onClose:()=>void}){
 const [mode,setMode]=useState<'signin'|'signup'>('signin');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('');try{if(mode==='signin')await signInWithEmailAndPassword(auth,email,password);else await createUserWithEmailAndPassword(auth,email,password)}catch(err){setMessage(friendly(err))}finally{setBusy(false)}}
 async function reset(){if(!email.trim()){setMessage('Enter your email first.');return}setBusy(true);try{await sendPasswordResetEmail(auth,email);setMessage('If this account exists, a reset email is on its way.')}catch(err){setMessage(friendly(err))}finally{setBusy(false)}}
 async function googleLogin(){setBusy(true);setMessage('');try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(err){const code=(err as {code?:string})?.code;if(code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment')setMessage('Your browser blocked the Google window. Open Project Graveyard in a regular browser and try again.');else if(code==='auth/account-exists-with-different-credential')setMessage('This email already uses a password. Sign in with email, then connect Google in My Profile to keep the same workspace.');else if(code!=='auth/popup-closed-by-user')setMessage(friendly(err))}finally{setBusy(false)}}
 return <div className="cloud-screen cloud-overlay" onMouseDown={onClose}><div className="cloud-card" role="dialog" aria-modal="true" aria-label={mode==='signin'?'Sign in to Project Graveyard':'Create a Project Graveyard account'} onMouseDown={e=>e.stopPropagation()}><button className="cloud-close" onClick={onClose} aria-label="Close sign-in dialog">×</button><span className="cloud-mark">✦</span><span className="eyebrow">PROJECT GRAVEYARD / PRIVATE CLOUD</span><h1>{mode==='signin'?'Welcome back.':'Give your ideas a home.'}</h1><p>Sign in to keep your projects, personal tasks, ideas, and focus progress in sync across devices.</p><button className="google-button" type="button" onClick={googleLogin} disabled={busy}><span className="google-logo" aria-hidden="true">G</span> Continue with Google</button><div className="cloud-divider"><span>OR USE EMAIL</span></div><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} autoComplete={mode==='signin'?'current-password':'new-password'}/></label><button className="primary" disabled={busy}>{busy?'Please wait…':mode==='signin'?'Sign in with email':'Create email account'}</button></form>{message&&<p className="cloud-error" role="status">{message}</p>}<div className="cloud-links"><button onClick={()=>{setMode(mode==='signin'?'signup':'signin');setMessage('')}}>{mode==='signin'?'Create an account':'Already have an account? Sign in'}</button><button onClick={reset} disabled={busy}>Forgot password?</button></div><small>Each account has a separate Firestore workspace. If you already use email login, connect Google from My Profile to keep the same data.</small></div></div>
}
