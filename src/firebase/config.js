import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

// ⚠️ แทนที่ค่าด้านล่างด้วย Firebase Config ของคุณ
const firebaseConfig = {
  apiKey: "AIzaSyC-bt6ZUs7uyoQX0ClTEIgRs_7wPk3EiXs",
  authDomain: "trailermanagement-9e012.firebaseapp.com",
  projectId: "trailermanagement-9e012",
  storageBucket: "trailermanagement-9e012.firebasestorage.app",
  messagingSenderId: "824053901481",
  appId: "1:824053901481:web:b97ff85f2269a2a44761b8",
  measurementId: "G-4L89K6GWQC"
};

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

