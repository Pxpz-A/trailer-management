import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from './config'

export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password)
}

export async function logout() {
  return await signOut(auth)
}

export async function createUser(email, password, name, role, phone = '') {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    name,
    email,
    role,
    phone,
    createdAt: new Date()
  })
  return userCredential
}

export async function getUsers() {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function updateUser(uid, data) {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function deleteUser(uid) {
  await deleteDoc(doc(db, 'users', uid))
}
