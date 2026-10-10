import {useState} from 'react';
import {GoogleAuthProvider,linkWithPopup,reload,sendEmailVerification,sendPasswordResetEmail,updateProfile,type User} from 'firebase/auth';
import {BadgeCheck,CalendarDays,Link2,LogOut,Mail,ShieldCheck,UserRound} from 'lucide-react';
import {auth} from './firebase';
import './profile.css';

const google=new GoogleAuthProvider();
const messageFor=(error:unknown)=>{
 const code=(error as {code?:string})?.code;
 if(code==='auth/popup-closed-by-user')return 'Google sign-in was cancelled.';
 if(code==='auth/popup-blocked'||code==='auth/operation-not-supported-in-this-environment')return 'Your browser blocked the Google window. Open Project Graveyard in a regular browser and try again.';
 if(code==='auth/credential-already-in-use')return 'That Google account already has a separate Project Graveyard account. Sign in with it separately; accounts are not merged automatically.';
 return error instanceof Error?error.message:'Something went wrong. Please try again.';
};
const date=(value?:string)=>value?new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'Not available';

export default function Profile({user,displayName,onNameSaved,onSignOut}:{user:User;displayName:string;onNameSaved:(name:string)=>void;onSignOut:()=>Promise<void>}){
 const [name,setName]=useState(displayName==='Maker'?(user.displayName||''):displayName);
 const [busy,setBusy]=useState('');
 const [notice,setNotice]=useState('');
 const [verified,setVerified]=useState(user.emailVerified);
 const [providers,setProviders]=useState(user.providerData.map(x=>x.providerId));
 const hasPassword=providers.includes('password'),hasGoogle=providers.includes('google.com');
 async function action(label:string,work:()=>Promise<void>,success:string){setBusy(label);setNotice('');try{await work();setNotice(success)}catch(error){setNotice(messageFor(error))}finally{setBusy('')}}
 async function saveName(){const value=name.trim();if(!value){setNotice('Please enter a display name.');return}await action('name',async()=>{await updateProfile(user,{displayName:value});onNameSaved(value)},'Display name updated across your workspace.')}
 async function connectGoogle(){await action('google',async()=>{await linkWithPopup(user,google);await reload(user);setProviders(user.providerData.map(x=>x.providerId));setVerified(user.emailVerified)},'Google is connected. You can use it to sign in next time.')}
 return <div className="profile-page"><div className="section-heading"><div><span className="eyebrow">ACCOUNT CENTER</span><h2>Your space, your identity.</h2><p className="profile-intro">Manage the account behind your private Project Graveyard workspace.</p></div></div>
  <div className="profile-hero panel"><div className="profile-avatar">{(name||user.email||'M').slice(0,1).toUpperCase()}</div><div><span className="eyebrow">SIGNED IN AS</span><h3>{displayName==='Maker'?(user.displayName||'Maker'):displayName}</h3><p>{user.email||'No email available'}</p><div className="profile-badges"><span><ShieldCheck size={14}/> Private workspace</span>{verified&&<span><BadgeCheck size={14}/> Verified email</span>}</div></div></div>
  {notice&&<div className="profile-notice" role="status">{notice}</div>}
  <div className="profile-grid"><section className="panel profile-panel"><div className="profile-panel-title"><UserRound size={19}/><div><span className="eyebrow">PUBLIC-FACING NAME</span><h3>Profile details</h3></div></div><label>Display name<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="How should we greet you?"/></label><p className="muted">This name appears in your own dashboard. Your account email is never shown to other users here.</p><button className="primary" onClick={saveName} disabled={!!busy}>{busy==='name'?'Saving…':'Save display name'}</button></section>
  <section className="panel profile-panel"><div className="profile-panel-title"><Link2 size={19}/><div><span className="eyebrow">SIGN-IN METHODS</span><h3>Ways to get back in</h3></div></div><div className="provider-row"><span className="provider-symbol">@</span><div><strong>Email and password</strong><small>{hasPassword?'Connected':'Not connected'}</small></div></div><div className="provider-row"><span className="provider-symbol google-symbol">G</span><div><strong>Google</strong><small>{hasGoogle?'Connected':'Not connected'}</small></div></div>{!hasGoogle&&<button className="secondary" onClick={connectGoogle} disabled={!!busy}>{busy==='google'?'Connecting…':'Connect Google account'}</button>}<p className="muted">Linking Google here keeps this workspace and its data under the same account.</p></section>
  <section className="panel profile-panel"><div className="profile-panel-title"><Mail size={19}/><div><span className="eyebrow">ACCOUNT SECURITY</span><h3>Email and recovery</h3></div></div><div className="profile-fact"><span>Email</span><strong>{user.email||'Not available'}</strong></div><div className="profile-fact"><span>Verification</span><strong>{verified?'Verified':'Not yet verified'}</strong></div><div className="profile-actions">{!verified&&<><button className="secondary" disabled={!!busy} onClick={()=>action('verify',()=>sendEmailVerification(user),'Verification email sent. Check your inbox.')}>{busy==='verify'?'Sending…':'Send verification email'}</button><button className="text-button" disabled={!!busy} onClick={()=>action('check',async()=>{await reload(user);setVerified(user.emailVerified)},'Verification status refreshed.')}>Check again</button></>}{hasPassword&&user.email&&<button className="secondary" disabled={!!busy} onClick={()=>action('reset',()=>sendPasswordResetEmail(auth,user.email!),'Password reset email sent. Check your inbox.')}>{busy==='reset'?'Sending…':'Email password reset link'}</button>}</div></section>
  <section className="panel profile-panel"><div className="profile-panel-title"><CalendarDays size={19}/><div><span className="eyebrow">ACCOUNT ACTIVITY</span><h3>Your workspace history</h3></div></div><div className="profile-fact"><span>Account created</span><strong>{date(user.metadata.creationTime)}</strong></div><div className="profile-fact"><span>Last sign-in</span><strong>{date(user.metadata.lastSignInTime)}</strong></div><p className="muted">Projects and personal data are stored in your private Firebase workspace. JSON backups are available in Settings.</p><button className="secondary profile-signout" onClick={onSignOut} disabled={!!busy}><LogOut size={15}/> Sign out</button></section></div>
 </div>
}
