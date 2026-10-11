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
