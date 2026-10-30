// Firebase Authentication & Firestore configuration
import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  GithubAuthProvider,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem("luna_firebase_config");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

const storedConfig = getStoredFirebaseConfig();

const firebaseConfig = storedConfig || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== "YOUR_API_KEY"
);

let app = null;
let auth = null;
let db = null;
let googleProvider = null;
let githubProvider = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    githubProvider = new GithubAuthProvider();
    githubProvider.addScope('read:user');
    githubProvider.addScope('repo');
  } catch (err) {
    console.warn("Failed to initialize Firebase:", err);
  }
}

export function saveRuntimeFirebaseConfig(configObj) {
  localStorage.setItem("luna_firebase_config", JSON.stringify(configObj));
  window.location.reload();
}

export { 
  app, 
  auth, 
  db, 
  googleProvider,
  githubProvider,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
