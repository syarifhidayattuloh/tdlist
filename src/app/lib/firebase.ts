import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// isi konfigurasi sesuai dengan konfigurasi firebase kalian
const firebaseConfig = {
    apiKey: "AIzaSyCla5jy54Gyp-sMvq4aRTBYbyNZTStaleQ",
    authDomain: "latihan-bcbf3.firebaseapp.com",
    projectId: "latihan-bcbf3",
    storageBucket: "latihan-bcbf3.firebasestorage.app",
    messagingSenderId: "462518637287",
    appId: "1:462518637287:web:4d5721fe92843f4fbac842",
    measurementId: "G-MJ9JF4JYV4"
  };

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
