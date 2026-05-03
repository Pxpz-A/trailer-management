import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy
} from 'firebase/firestore'
import { db } from './config'

const COL = 'maintenance'

export async function getMaintenance(truckId = null) {
  let q = collection(db, COL)
  if (truckId) {
    q = query(collection(db, COL), where('truckId', '==', truckId), orderBy('date', 'desc'))
  }
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addMaintenance(data) {
  return await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
}

export async function updateMaintenance(id, data) {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteMaintenance(id) {
  await deleteDoc(doc(db, COL, id))
}
