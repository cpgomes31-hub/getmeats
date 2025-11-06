// Firebase configuration
// NOTE: you provided project details; fill additional fields in the console if needed.
import { initializeApp } from 'firebase/app'

export const firebaseConfig = {
  apiKey: 'AIzaSyAyePBbzKcAuASi5U4uz8pkqgCG92ecHIg',
  authDomain: 'getmeats.firebaseapp.com',
  projectId: 'getmeats',
  storageBucket: 'getmeats.appspot.com',
  messagingSenderId: '448977262837',
  appId: '1:448977262837:web:ee792526b6ac636a3b8dbc'
}

export const app = initializeApp(firebaseConfig)
