import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where
} from 'firebase/firestore'
import { db } from './config'

const COL = 'insurance'

export async function getInsurance(truckId = null) {
  let q = collection(db, COL)
  if (truckId) {
    q = query(collection(db, COL), where('truckId', '==', truckId))
  }
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addInsurance(data) {
  return await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
}

export async function updateInsurance(id, data) {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteInsurance(id) {
  await deleteDoc(doc(db, COL, id))
}
