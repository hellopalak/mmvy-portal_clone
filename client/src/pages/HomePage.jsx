import StatusMessage from '../components/StatusMessage';
import { categoryButtons } from '../utils';

export default function HomePage({ navigate, flash, setFlash }) {
  const date = new Intl.DateTimeFormat('en-GB').format(new Date());
  const cards = [
    ['fa-file-pen', 'New MMVY Application', () => navigate('apply', 'MMVY')],
    ['fa-user-graduate', 'User Profile / Update Details', () => navigate('profile')],
    ['fa-table-list', 'All User Data Dashboard', () => navigate('dashboard')],
    ['fa-share-nodes', 'Shared Partner Portal', () => navigate('partner')],
    ['fa-plug', 'API Setu User Lookup', () => setFlash('API Setu lookup: GET /api-setu/users/:userId with the x-api-setu-key header. It returns a shareable view of the same canonical record.', 'info')],
    ['fa-circle-question', 'FAQ / Help', () => setFlash('Use New Application to submit information, My Profile to update a User ID, Partner Portal to read the shared record, and API Setu with the documented endpoint and API key.', 'info')]
  ];
  return <main className="main-container" id="main-content"><div className="portal-title">Welcome to MMVY Portal</div><div className="content-card">
    <StatusMessage message={flash} />
    <button className="btn-green-banner" onClick={() => navigate('dashboard')}>DASHBOARD - {date}</button>
    <button className="btn-green-banner" onClick={() => navigate('apply', 'MMVY')}>New MMVY Application {date}</button>
    <div className="category-grid">{categoryButtons.map((name) => <button key={name} className="btn-category" onClick={() => setFlash(`Institute filter selected: ${name}. Use the application form to submit a record for this institute type.`, 'info')}>{name}</button>)}</div>
    <div className="instructions-box">
      <div className="btn-green-banner" style={{ marginBottom: 5, cursor: 'default' }}>Instructions for Paper-less Process for sanction &amp; e-Payment of MMVY Applications</div>
      <Instruction>MMVY योजना का क्रियान्वयन सरल एवं पेपर-लेस प्रक्रिया के अनुसार सुनिश्चित करने हेतु संस्थाओं को छात्रों के प्रस्ताव की स्कैन कॉपी पोर्टल पर अपलोड करने की बाध्यता समाप्त कर दी गई है।</Instruction>
      <Instruction>Sanctioning Authorities को छात्रवृत्ति स्वीकृति आदेश की स्कैन कॉपी अपलोड करने की बाध्यता से राहत दी गई है। आवेदन अब इस पोर्टल से सीधे PostgreSQL data store में सुरक्षित किया जाता है।</Instruction>
      <Instruction>एक ही common data model MMVY portal, Partner portal और API Setu में इस्तेमाल किया जाता है, इसलिए verified user data share किया जा सकता है।</Instruction>
    </div>
    <div className="nav-grid">{cards.map(([icon, title, action]) => <button key={title} className="nav-card-btn" onClick={action}><span className="nav-card-icon"><i className={`fa-solid ${icon}`} /></span><span className="nav-card-text">{title}</span></button>)}</div>
  </div></main>;
}

function Instruction({ children }) {
  return <div className="instruction-item"><span className="speaker-icon"><i className="fa-solid fa-bullhorn" /></span><div>{children}</div></div>;
}
