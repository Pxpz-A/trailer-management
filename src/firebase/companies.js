import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

const COL = 'companies'

export async function getCompanies() {
  const snapshot = await getDocs(collection(db, COL))
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addCompany(data) {
  return await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
}

export async function updateCompany(id, data) {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteCompany(id) {
  await deleteDoc(doc(db, COL, id))
}
