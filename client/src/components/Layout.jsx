export function Hero({ setFlash }) {
  return <section className="hero-section" aria-label="MMVY portal banner"><div className="hero-overlay">
    <div className="hero-title">मुख्यमंत्री मेधावी विद्यार्थी योजना पोर्टल</div>
    <div className="hero-subtitle">मध्य प्रदेश सरकार का सभी वर्ग के मेधावी विद्यार्थियों की सहायता हेतु एक समग्र प्रयास</div>
    <button className="hero-link" onClick={() => setFlash('This working prototype connects MMVY applications, the partner portal and API Setu to a common PostgreSQL schema.', 'info')}>योजना के बारे में और अधिक जानें</button>
  </div></section>;
}

export function Footer({ setFlash }) {
  return <><button className="fab-btn" onClick={() => setFlash('For technical help, contact the portal help desk. Do not share your bank number or API key in support messages.', 'warning')} title="Help assistant" aria-label="Help assistant"><i className="fa-solid fa-child-reaching" /></button><footer className="footer">Designed &amp; Developed By NIC Bhopal MP. Portal is best viewed in FireFox, Chrome, Opera or current browsers. The screen resolution desired is 1024×768 or above.</footer></>;
}

export function Notice({ close }) {
  return <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Important MMVY notices"><div className="modal-container"><div className="modal-header"><span>महत्वपूर्ण सूचनाएँ - MMVY</span><button className="modal-close" onClick={close} aria-label="Close">×</button></div><div className="modal-body">
    <div className="modal-list-item"><i className="fa-solid fa-circle-arrow-right" /><div>सत्र 2025-26 में प्रवेशित विद्यार्थियों के नवीन आवेदन तथा पूर्व सत्रों के नवीनीकरण आवेदन की तिथियाँ विभाग द्वारा निर्धारित की जाती हैं।</div></div>
    <div className="modal-list-item"><i className="fa-solid fa-circle-arrow-right" /><div><span className="highlight-red">केवल सही, सत्यापित और सहमति-युक्त जानकारी ही आवेदन में दर्ज करें।</span></div></div>
    <div className="modal-list-item"><i className="fa-solid fa-circle-arrow-right" /><div>आवेदन submit होने पर User ID और Application ID सुरक्षित रखें। यही User ID shared portal एवं API Setu lookup में प्रयुक्त होगी।</div></div>
  </div></div></div>;
}
