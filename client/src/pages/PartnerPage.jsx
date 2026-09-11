import { getProfile } from '../api';
import ProfileDetails from '../components/ProfileDetails';
import StatusMessage from '../components/StatusMessage';

export default function PartnerPage({ profile, setProfile, navigate, flash, setFlash }) {
  async function lookup(event) {
    event.preventDefault();
    const userId = new FormData(event.currentTarget).get('userId');
    try { const result = await getProfile(userId, '/api/partner/users/'); setProfile(result.data); setFlash('Shared profile loaded from the common data store.', 'success'); } catch (error) { setFlash(error.message, 'error'); }
  }
  return <main className="main-container"><div className="portal-title">Shared Partner Portal</div><div className="content-card"><StatusMessage message={flash} /><p className="section-lead">This second portal does not make a duplicate database. It uses the same MMVY user and application tables, and records partner submissions as <code>SERVICE_PORTAL</code>.</p><form className="lookup-row" onSubmit={lookup}><input name="userId" required placeholder="Enter MMVY User ID" aria-label="MMVY User ID" /><button className="primary-btn" type="submit"><i className="fa-solid fa-share-nodes" /> Fetch Shared Data</button></form>{profile ? <><div className="status success">Shared profile found in the common PostgreSQL data store.</div><ProfileDetails profile={profile} /><div className="page-actions" style={{ marginTop: 18 }}><button className="secondary-btn" onClick={() => navigate('apply', 'SERVICE_PORTAL')}>Create Partner Application</button></div></> : <div className="empty-state">Look up an MMVY User ID to display the same data that is available to this connected portal.</div>}</div></main>;
}
