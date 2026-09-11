import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');

function getPortalIdFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!path.startsWith('/profile/')) return '';

  try {
    return decodeURIComponent(path.slice('/profile/'.length)).trim();
  } catch {
    return '';
  }
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function PortalLookup({ onLookup }) {
  const [portalId, setPortalId] = useState('');

  function submit(event) {
    event.preventDefault();
    onLookup(portalId.trim());
  }

  return (
    <main className="centered-page">
      <section className="card lookup-card">
        <p className="eyebrow">PORTAL</p>
        <h1>Find your profile</h1>
        <p className="muted">Enter your portal ID to view your registered details.</p>
        <form onSubmit={submit}>
          <label htmlFor="portalId">Portal ID</label>
          <input
            id="portalId"
            value={portalId}
            onChange={(event) => setPortalId(event.target.value)}
            placeholder="e.g. PORTAL-1001"
            autoComplete="off"
            required
          />
          <button type="submit">View profile</button>
        </form>
      </section>
    </main>
  );
}

function ProfilePage({ portalId, onBack }) {
  const [user, setUser] = useState(null);
  const [state, setState] = useState({ loading: true, error: '' });
  const socket = useMemo(() => io(API_URL, { autoConnect: false }), []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setState({ loading: true, error: '' });
      try {
        const response = await fetch(`${API_URL}/api/users/${encodeURIComponent(portalId)}`);
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || 'Unable to load the profile.');
        if (active) {
          setUser(payload.data);
          setState({ loading: false, error: '' });
        }
      } catch (error) {
        if (active) setState({ loading: false, error: error.message });
      }
    }

    loadProfile();
    socket.connect();
    socket.emit('profile:subscribe', portalId);
    socket.on('user:updated', (updatedUser) => {
      if (updatedUser.porta === portalId) setUser(updatedUser);
    });

    return () => {
      active = false;
      socket.emit('profile:unsubscribe', portalId);
      socket.disconnect();
    };
  }, [portalId, socket]);

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div>
          <p className="eyebrow">PORTAL PROFILE</p>
          <h1>{portalId}</h1>
        </div>
        <button className="secondary-button" onClick={onBack}>Search another ID</button>
      </header>

      {state.loading && <p className="status">Loading profile…</p>}
      {state.error && <p className="status error">{state.error}</p>}
      {user && (
        <section className="details-grid" aria-label="User details">
          {Object.entries(user).map(([key, value]) => (
            <article className="detail-card" key={key}>
              <p>{key.replaceAll('_', ' ')}</p>
              <strong>{displayValue(value)}</strong>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default function App() {
  const [portalId, setPortalId] = useState(getPortalIdFromPath);

  useEffect(() => {
    function syncProfileFromBrowserHistory() {
      setPortalId(getPortalIdFromPath());
    }

    window.addEventListener('popstate', syncProfileFromBrowserHistory);
    return () => window.removeEventListener('popstate', syncProfileFromBrowserHistory);
  }, []);

  function openProfile(nextPortalId) {
    if (!nextPortalId) return;
    window.history.pushState({}, '', `/profile/${encodeURIComponent(nextPortalId)}`);
    setPortalId(nextPortalId);
  }

  function returnToSearch() {
    window.history.pushState({}, '', '/');
    setPortalId('');
  }

  return portalId
    ? <ProfilePage portalId={portalId} onBack={returnToSearch} />
    : <PortalLookup onLookup={openProfile} />;
}
