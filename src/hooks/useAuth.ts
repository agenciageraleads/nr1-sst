import { useEffect, useState } from 'react';
import { api, AppUser } from '../lib/api';

let cachedUser: AppUser | null = null;

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(cachedUser);
  const [isAuthorized, setIsAuthorized] = useState(Boolean(cachedUser));
  const [loading, setLoading] = useState(!cachedUser);

  useEffect(() => {
    let active = true;
    api.me()
      .then(({ user }) => {
        if (!active) return;
        cachedUser = user;
        setUser(user);
        setIsAuthorized(true);
      })
      .catch(() => {
        if (!active) return;
        cachedUser = null;
        setUser(null);
        setIsAuthorized(false);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { user, isAuthorized, loading };
}

export function setCachedUser(user: AppUser | null) {
  cachedUser = user;
}
