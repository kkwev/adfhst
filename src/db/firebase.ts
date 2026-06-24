import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "gen-lang-client-0631640025",
  appId: "1:741745624092:web:975ff2a787765996760bd9",
  apiKey: "AIzaSyCau6-c4BhJOoZLstWCCbhu2fYx5_lZ0eA",
  authDomain: "gen-lang-client-0631640025.firebaseapp.com",
  storageBucket: "gen-lang-client-0631640025.firebasestorage.app",
  messagingSenderId: "741745624092",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-77b32e73-4355-4202-b52b-d1541ad1eaeb");
