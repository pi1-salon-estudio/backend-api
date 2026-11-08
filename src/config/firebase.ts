import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// applicationDefault() busca la llave en GOOGLE_APPLICATION_CREDENTIALS.
// El mismo código funciona en local (C:\secrets\...) y en Render (Secret File).
const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() })

export const db = getFirestore(app)
export const auth = getAuth(app)
