import {
  collection, addDoc, getDocs, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy
} from 'firebase/firestore'
import { db } from './config'

const COL = 'trips'

export async function getTrips(truckId = null) {
  let q = collection(db, COL)
  if (truckId) {
    q = query(collection(db, COL), where('truckId', '==', truckId), orderBy('tripDate', 'desc'))
  }
  const snapshot = await getDocs(q)
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function addTrip(data) {
  return await addDoc(collection(db, COL), { ...data, createdAt: serverTimestamp() })
}

export async function updateTrip(id, data) {
  await updateDoc(doc(db, COL, id), data)
}

export async function deleteTrip(id) {
  await deleteDoc(doc(db, COL, id))
}

export async function markTripReceived(id, receivedDate) {
  await updateDoc(doc(db, COL, id), {
    status: 'received',
    receivedDate
  })
}
