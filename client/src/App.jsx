import { useState } from 'react';
import Header from './components/Header';
import { Footer, Hero, Notice } from './components/Layout';
import ApplicationPage from './pages/ApplicationPage';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import PartnerPage from './pages/PartnerPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  const [view, setView] = useState('home');
  const [source, setSource] = useState('MMVY');
  const [profile, setProfile] = useState(null);
  const [flash, setFlashState] = useState(null);
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [fontSize, setFontSize] = useState('');
  const setFlash = (text, kind = 'info') => setFlashState({ text, kind });
  const navigate = (nextView, nextSource, message, kind) => {
    setView(nextView);
    if (nextSource) setSource(nextSource);
    setFlashState(message ? { text: message, kind: kind || 'info' } : null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const shared = { profile, setProfile, flash, setFlash, navigate };
  let page;
  if (view === 'apply') page = <ApplicationPage {...shared} source={source} />;
  else if (view === 'profile') page = <ProfilePage {...shared} />;
  else if (view === 'dashboard') page = <DashboardPage {...shared} />;
  else if (view === 'partner') page = <PartnerPage {...shared} />;
  else page = <HomePage {...shared} />;
  return <div style={{ fontSize }}><Header navigate={navigate} setFlash={setFlash} fontSize={fontSize} setFontSize={setFontSize} /><Hero setFlash={setFlash} />{page}<Footer setFlash={setFlash} />{noticeOpen && view === 'home' && <Notice close={() => setNoticeOpen(false)} />}</div>;
}
