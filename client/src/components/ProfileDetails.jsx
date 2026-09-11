import { dateTime, dateValue, readable } from '../utils';

export default function ProfileDetails({ profile, onEdit }) {
  const details = [
    ['Full name', `${profile.first_name || ''} ${profile.last_name || ''}`.trim()], ['Mobile', profile.mobile], ['Email', profile.email], ['Date of birth', dateValue(profile.date_of_birth)],
    ['Gender', profile.gender], ['Guardian', profile.guardian_name], ['Category', profile.category], ['Aadhaar (last 4 only)', profile.aadhaar_last4], ['Domicile state', profile.domicile_state],
    ['Address', [profile.address_line1, profile.address_line2, profile.village_or_ward, profile.city, profile.district, profile.state, profile.pincode].filter(Boolean).join(', ')],
    ['Bank', [profile.bank_name, profile.bank_account_number, profile.ifsc_code].filter(Boolean).join(' · ')], ['Last updated', dateTime(profile.updated_at)]
  ];
  const apps = profile.applications || [];
  return <><div className="profile-heading"><div><h2>{`${profile.first_name || ''} ${profile.last_name || ''}`.trim()}</h2><span className="identity-chip"><i className="fa-solid fa-id-card" /> {profile.user_id}</span><p className="small-note" style={{ margin: '8px 0 0' }}>Your complete stored profile and submitted application details are displayed below.</p></div>{onEdit && <button className="secondary-btn" onClick={onEdit}><i className="fa-solid fa-pen" /> Update Information</button>}</div>
    <div className="details-grid">{details.map(([label, value]) => <div className="detail" key={label}><span className="detail-label">{label}</span><span className="detail-value">{value || '—'}</span></div>)}</div>
    <h3 style={{ color: '#2e7d32', margin: '20px 0 10px' }}>Applications ({apps.length})</h3>
    <div className="application-list">{apps.length ? apps.map((item) => <Application key={item.application_id} item={item} />) : <div className="empty-state">No application has been submitted for this profile yet.</div>}</div>
  </>;
}

function Application({ item }) {
  const details = [['Application source', readable(item.source_portal)], ['Scheme', item.scheme_name], ['Institute type', item.institute_type], ['Course type', item.course_type], ['Admission date', dateValue(item.admission_date)], ['Qualifying examination', item.qualifying_exam], ['Qualifying percentage', item.qualifying_percentage], ['Family annual income', item.family_annual_income ? `₹${item.family_annual_income}` : null]];
  return <div className="application-item"><span className="application-status">{readable(item.status)}</span><h4>{item.application_id} · {item.scheme_name}</h4><p><strong>{item.course_name}</strong> at {item.institute_name}</p><p>{item.academic_year} · {readable(item.application_type)} · Submitted {dateTime(item.submitted_at)}</p><div className="application-detail-grid">{details.map(([label, value]) => <div className="application-detail" key={label}><span className="application-detail-label">{label}</span><span className="application-detail-value">{value || '—'}</span></div>)}</div></div>;
}
