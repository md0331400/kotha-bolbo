// ============================================================
// FIREBASE CONFIGURATION
// Replace these values with your own Firebase project config
// ============================================================

export const firebaseConfig = {
  apiKey: "AIzaSyBa2bIHkBNK_oajNeFxgKpz4VrIx1aR5Fo",
  authDomain: "kotha-bolbo-aso.firebaseapp.com",
  projectId: "kotha-bolbo-aso",
  storageBucket: "kotha-bolbo-aso.firebasestorage.app",
  messagingSenderId: "343828860232",
  appId: "1:343828860232:web:b566c74f630f8a2532b77d"
  databaseURL: "https://kotha-bolbo-aso-default-rtdb.asia-southeast1.firebasedatabase.app"

};

export const isFirebaseConfigured = (): boolean => {
  return firebaseConfig.apiKey !== "AIzaSyBa2bIHkBNK_oajNeFxgKpz4VrIx1aR5Fo" && firebaseConfig.apiKey.length > 10;
};