import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, child, DatabaseReference } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export interface JobOffer {
  id: string;
  company: string;
  location: string;
  base: number;
  bonus: number;
  signOn: number;
  relocation: number;
  OtherExpenses: number;
  equity: {
    type: "RSU" | "Options";
    amount: number;
    vestingPeriod: number;
    vestingSchedule: string;
    marketRate: number;
  };
}

export const getUserOffers = async (userId: string): Promise<JobOffer[]> => {
  const dbRef = ref(database);
  try {
    const snapshot = await get(child(dbRef, `users/${userId}/offers`));
    if (snapshot.exists()) {
      return Object.values(snapshot.val()) as JobOffer[];
    } else {
      console.log("No data available");
      return [];
    }
  } catch (error) {
    console.error("Error fetching user offers:", error);
    throw error;
  }
};

export const updateUserOffers = async (userId: string, offers: JobOffer[]): Promise<void> => {
  const dbRef = ref(database, `users/${userId}/offers`);
  try {
    await set(dbRef, offers.reduce((acc, offer) => ({ ...acc, [offer.id]: offer }), {}));
    console.log("Offers updated successfully");
  } catch (error) {
    console.error("Error updating user offers:", error);
    throw error;
  }
};

export { database };

