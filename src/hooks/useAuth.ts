import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser?.email);
      if (firebaseUser) {
        const userEmail = firebaseUser.email?.toLowerCase() || '';
        // Check super admin email
        if (userEmail === 'contato@venturatc.com.br') {
          console.log('Super admin detected');
          setIsAuthorized(true);
        } else {
          // Check users collection using email as ID
          try {
            const userDoc = await getDoc(doc(db, 'users', userEmail));
            const exists = userDoc.exists();
            console.log('User authorization check:', exists);
            setIsAuthorized(exists);
          } catch (error) {
            console.error('Error checking authorization in Firestore:', error);
            setIsAuthorized(false);
          }
        }
      } else {
        setIsAuthorized(false);
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAuthorized, loading };
}
