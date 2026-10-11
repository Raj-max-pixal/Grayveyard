import {readFileSync} from 'node:fs';
import {after,before,test} from 'node:test';
import assert from 'node:assert/strict';
import {assertFails,assertSucceeds,initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc} from 'firebase/firestore';

let env;
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-project-graveyard',firestore:{rules:readFileSync(new URL('../firestore.rules',import.meta.url),'utf8')}})});
after(async()=>{await env?.cleanup()});

test('a signed-in user can write and read only their own workspace',async()=>{
 const alice=env.authenticatedContext('alice').firestore();
 const bob=env.authenticatedContext('bob').firestore();
 const guest=env.unauthenticatedContext().firestore();
 const aliceProject=doc(alice,'users/alice/projects/first');
 await assertSucceeds(setDoc(aliceProject,{id:'first',name:'Real project'}));
 const own=await assertSucceeds(getDoc(aliceProject));
 assert.equal(own.data()?.name,'Real project');
 await assertFails(getDoc(doc(bob,'users/alice/projects/first')));
 await assertFails(setDoc(doc(bob,'users/alice/projects/second'),{id:'second'}));
 await assertFails(getDoc(doc(guest,'users/alice/projects/first')));
 await assertFails(setDoc(doc(alice,'public/accidental'),{data:'no'}));
 const exam=doc(alice,'users/alice/planner/exam-one');
 await assertSucceeds(setDoc(exam,{id:'exam-one',kind:'exam',title:'Final exam'}));
 await assertFails(getDoc(doc(bob,'users/alice/planner/exam-one')));
});

test('community submissions stay pending until a trusted publisher approves them',async()=>{
 const alice=env.authenticatedContext('alice').firestore();
 const bob=env.authenticatedContext('bob').firestore();
 const guest=env.unauthenticatedContext().firestore();
 const pending=doc(alice,'publicProjects/pending-one');
 const submission={ownerId:'alice',name:'A real archive',shortDescription:'A sufficiently detailed description for a legitimate project.',repositoryUrl:'https://github.com/alice/archive',websiteUrl:'',category:'Developer Tools',languages:['TypeScript'],stack:['React'],submitterName:'Alice',status:'pending'};
 await assertSucceeds(setDoc(pending,submission));
 await assertSucceeds(getDoc(pending));
 await assertFails(getDoc(doc(bob,'publicProjects/pending-one')));
 await assertFails(getDoc(doc(guest,'publicProjects/pending-one')));
 await assertFails(setDoc(pending,{...submission,status:'published'}));
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'publicProjects/published-one'),{...submission,ownerId:'moderator',status:'published'}));
 await assertSucceeds(getDoc(doc(guest,'publicProjects/published-one')));
 await assertFails(setDoc(doc(bob,'publicProjects/pending-one'),{...submission,ownerId:'alice',status:'pending'}));
});

test('a trusted admin can moderate and audit without changing ownership',async()=>{
 const moderator=env.authenticatedContext('moderator',{admin:true}).firestore();
 const alice=env.authenticatedContext('alice').firestore();
 const pending=doc(moderator,'publicProjects/admin-check');
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'publicProjects/admin-check'),{ownerId:'alice',name:'Admin review',shortDescription:'A sufficiently detailed description for review.',repositoryUrl:'https://github.com/alice/review',websiteUrl:'',category:'Open Source',languages:[],stack:[],submitterName:'Alice',status:'pending',createdAt:'2026-10-11T00:00:00.000Z'}));
 await assertSucceeds(getDoc(pending));
 await assertSucceeds(setDoc(pending,{ownerId:'alice',name:'Admin review',shortDescription:'A sufficiently detailed description for review.',repositoryUrl:'https://github.com/alice/review',websiteUrl:'',category:'Open Source',languages:[],stack:[],submitterName:'Alice',status:'published',moderatedBy:'moderator'}));
 await assertSucceeds(setDoc(doc(moderator,'moderationAudit/admin-check'),{projectId:'admin-check',action:'approved',moderatorUid:'moderator'}));
 await assertFails(setDoc(doc(alice,'moderationAudit/not-alice'),{projectId:'admin-check'}));
});

test('resurrection proposals enforce project publication and author ownership',async()=>{
 const alice=env.authenticatedContext('alice').firestore();
 const bob=env.authenticatedContext('bob').firestore();
 await env.withSecurityRulesDisabled(async context=>setDoc(doc(context.firestore(),'publicProjects/revival-project'),{ownerId:'owner',name:'Published project',status:'published'}));
 const proposal=doc(alice,'publicProjects/revival-project/proposals/idea-one');
 const value={projectId:'revival-project',authorId:'alice',title:'Improve the docs',problem:'The setup path is difficult for new contributors.',solution:'Add a tested quick-start guide and a troubleshooting page.',status:'Proposed'};
 await assertSucceeds(setDoc(proposal,value));
 await assertFails(setDoc(doc(bob,'publicProjects/revival-project/proposals/idea-one'),{...value,authorId:'alice'}));
 await assertFails(setDoc(proposal,{...value,status:'Resurrected'}));
});
