import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {initializeFirestore} from 'firebase/firestore';

const app=initializeApp({
 apiKey:'AIzaSyAe0pBO3V85cUBH9r6ZouQ5Eusi8Qr8oQs',
 authDomain:'project-graveyard-2026.firebaseapp.com',
 projectId:'project-graveyard-2026',
 storageBucket:'project-graveyard-2026.firebasestorage.app',
 messagingSenderId:'339060429029',
 appId:'1:339060429029:web:650ee60bd9e198a285040c'
});

// Firebase web configuration identifies the project; Firestore rules enforce access.
export const auth=getAuth(app);
export const db=initializeFirestore(app,{ignoreUndefinedProperties:true});
