import { useState } from 'react';
import { api, getProfile } from '../api';
import StatusMessage from '../components/StatusMessage';
import { dateTime } from '../utils';

export default function DashboardPage({ navigate, flash, setFlash, setProfile }) {
  const [users, setUsers] = useState(null);
  async function loadUsers() {
    try { const result = await api('/api/users'); setUsers(result.data); setFlash(`${result.count} user record(s) loaded.`, 'success'); } catch (error) { setFlash(error.message, 'error'); }
  }
  async function openProfile(userId) {
    try { const result = await getProfile(userId); setProfile(result.data); navigate('profile'); } catch (error) { setFlash(error.message, 'error'); }
  }
  return <main className="main-container"><div className="portal-title">MMVY User Data Dashboard</div><div className="content-card"><StatusMessage message={flash} /><p className="section-lead">This screen uses <code>GET /api/users</code> and shows every stored user with their applications. It is intended for an authorised internal administrator.</p><div className="page-actions"><button className="primary-btn" onClick={loadUsers}><i className="fa-solid fa-rotate" /> Load All User Data</button><button className="ghost-btn" onClick={() => navigate('home')}>Back to Home</button></div>{users === null ? <div className="empty-state">Select “Load All User Data” to retrieve the shared data set.</div> : users.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>User ID</th><th>Name</th><th>Mobile</th><th>Address</th><th>Applications</th><th>Updated</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id}><td><button className="link-button" onClick={() => openProfile(user.user_id)}>{user.user_id}</button></td><td>{`${user.first_name || ''} ${user.last_name || ''}`.trim()}</td><td>{user.mobile}</td><td>{[user.address_line1, user.city, user.district, user.state].filter(Boolean).join(', ')}</td><td>{(user.applications || []).length}</td><td>{dateTime(user.updated_at)}</td></tr>)}</tbody></table></div> : <div className="empty-state">No user records have been submitted yet.</div>}</div></main>;
}
