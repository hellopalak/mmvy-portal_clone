import { useState } from 'react';
import { getProfile } from '../api';
import ProfileDetails from '../components/ProfileDetails';
import ProfileEditForm from '../components/ProfileEditForm';
import StatusMessage from '../components/StatusMessage';

export default function ProfilePage({ profile, setProfile, flash, setFlash }) {
  const [editing, setEditing] = useState(false);
  async function lookup(event) {
    event.preventDefault();
    const userId = new FormData(event.currentTarget).get('userId');
    try { const result = await getProfile(userId); setProfile(result.data); setEditing(false); setFlash('Profile loaded successfully.', 'success'); } catch (error) { setFlash(error.message, 'error'); }
  }
  const save = (updatedProfile) => { setProfile(updatedProfile); setEditing(false); setFlash('User information updated successfully.', 'success'); };
  return <main className="main-container"><div className="portal-title">User Profile</div><div className="content-card"><StatusMessage message={flash} /><p className="section-lead">Enter your MMVY User ID to view all user information, address/bank details and submitted applications.</p><form className="lookup-row" onSubmit={lookup}><input name="userId" required placeholder="Example: MMVY-00010001" aria-label="MMVY User ID" defaultValue={profile?.user_id || ''} /><button className="primary-btn" type="submit"><i className="fa-solid fa-magnifying-glass" /> View Profile</button></form>{profile ? (editing ? <ProfileEditForm profile={profile} onCancel={() => setEditing(false)} onSaved={save} setFlash={setFlash} /> : <ProfileDetails profile={profile} onEdit={() => setEditing(true)} />) : <div className="empty-state">Your stored MMVY profile will appear here after a successful lookup or application submission.</div>}</div></main>;
}
