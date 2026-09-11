import { useEffect, useState } from 'react';

export default function Header({ navigate, setFlash, fontSize, setFontSize }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdown, setDropdown] = useState('');
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const go = (view, source) => {
    setMenuOpen(false);
    setDropdown('');
    navigate(view, source);
  };
  const toggle = (name) => setDropdown((current) => current === name ? '' : name);
  const date = new Intl.DateTimeFormat('en-GB').format(clock);

  return <>
    <div className="top-bar">
      <div className="top-bar-left">
        <span>Date : {date} {clock.toLocaleTimeString('en-GB')}</span>
        <span>Help Desk: <i className="fa-solid fa-phone" /> 0755-2660063</span>
        <span><i className="fa-solid fa-envelope" /> mmvyhelpline[dot]dte[at]mp[dot]gov[dot]in</span>
      </div>
      <div className="top-bar-right">
        <button className="top-link" onClick={() => go('home')}>Home</button> |
        <button className="top-link" onClick={() => go('profile')}>My Profile</button> |
        <span aria-label="Font size"><button className="accessibility-btn" onClick={() => setFontSize('12px')}>A-</button><button className="accessibility-btn" onClick={() => setFontSize('')}>A</button><button className="accessibility-btn" onClick={() => setFontSize('16px')}>A+</button></span>
        <span style={{ fontWeight: 'bold' }}>Hindi</span>
      </div>
    </div>
    <header className="main-header">
      <div className="logo-container"><img src="https://www.medhavikalyan.mp.gov.in/MedhaviChhatra/Medhavi_New/images/logo/logo.svg" alt="Medhavi Kalyan Logo" /></div>
      <button className="hamburger-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><i className="fa-solid fa-bars" /></button>
      <nav className={`main-nav${menuOpen ? ' active' : ''}`} style={{ fontSize }}>
        <div className={`nav-item${dropdown === 'home' ? ' open' : ''}`}>
          <button className="nav-button" onClick={() => toggle('home')}><i className="fa-solid fa-house" /> Home <i className="fa-solid fa-caret-down" /></button>
          <div className="dropdown-content"><button onClick={() => go('home')}>Home</button><button onClick={() => go('dashboard')}>Dashboard</button></div>
        </div>
        <div className="nav-item"><button className="nav-button" onClick={() => go('profile')}><i className="fa-solid fa-right-to-bracket" /> Login / Profile</button></div>
        <div className={`nav-item${dropdown === 'scheme' ? ' open' : ''}`}>
          <button className="nav-button" onClick={() => toggle('scheme')}><i className="fa-solid fa-cube" /> Scheme <i className="fa-solid fa-caret-down" /></button>
          <div className="dropdown-content"><button onClick={() => go('apply', 'MMVY')}>New MMVY Application</button><button onClick={() => go('partner')}>Partner Portal</button></div>
        </div>
        <div className="nav-item"><button className="nav-button faq-btn" onClick={() => setFlash('Use New Application to submit information, My Profile to update a User ID, Partner Portal to read the shared record, and API Setu with the documented endpoint and API key.', 'info')}><i className="fa-solid fa-circle-question" /> FAQ</button></div>
        <div className={`nav-item${dropdown === 'application' ? ' open' : ''}`}>
          <button className="nav-button" onClick={() => toggle('application')}><i className="fa-solid fa-list" /> Application for MMVY ONLY <i className="fa-solid fa-caret-down" /></button>
          <div className="dropdown-content"><button onClick={() => go('apply', 'MMVY')}>New Application</button><button onClick={() => go('profile')}>View / Update Profile</button></div>
        </div>
        <button className="btn-mmjky" onClick={() => go('partner')}>Go to Shared Partner Portal</button>
      </nav>
    </header>
  </>;
}
