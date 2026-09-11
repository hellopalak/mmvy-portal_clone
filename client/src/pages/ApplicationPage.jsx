import { api } from '../api';
import { Input, Select } from '../components/FormFields';
import StatusMessage from '../components/StatusMessage';
import { categoryButtons, dateValue, profileFromForm } from '../utils';

export default function ApplicationPage({ source, profile, navigate, flash, setFlash, setProfile }) {
  const isPartner = source === 'SERVICE_PORTAL';
  const p = profile || {};
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      await api('/api/health');
      const payload = {
        userId: data.get('userId') || undefined,
        profile: profileFromForm(data),
        application: {
          applicationType: data.get('applicationType'), academicYear: data.get('academicYear'), schemeName: data.get('schemeName'),
          instituteName: data.get('instituteName'), instituteCode: data.get('instituteCode'), instituteType: data.get('instituteType'),
          courseName: data.get('courseName'), courseType: data.get('courseType'), admissionDate: data.get('admissionDate'),
          qualifyingExam: data.get('qualifyingExam'), qualifyingPercentage: data.get('qualifyingPercentage'),
          familyAnnualIncome: data.get('familyAnnualIncome'), consentGiven: data.get('consentGiven') === 'on'
        }
      };
      const endpoint = isPartner ? '/api/partner/applications' : '/api/applications';
      const result = await api(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setProfile(result.data);
      navigate('profile', undefined, `Application submitted. User ID: ${result.userId}; Application ID: ${result.applicationId}. Please save both IDs.`, 'success');
    } catch (error) {
      setFlash(`Application was not saved. ${error.message}`, 'error');
    } finally { button.disabled = false; }
  }
  return <main className="main-container"><div className="portal-title">{isPartner ? 'Partner Portal Application' : 'New MMVY Application'}</div><div className="content-card">
    <StatusMessage message={flash} />
    <p className="section-lead">{isPartner ? 'This application is submitted by the second portal, but it uses the same shared PostgreSQL user profile.' : 'Complete the form below. On successful submission, a permanent MMVY User ID and Application ID are generated.'}</p>
    <form onSubmit={submit}>
      <section className="form-card"><h2>1. User Information</h2><p className="form-hint">Fields marked <span className="required">*</span> are required. Enter an existing User ID only when submitting another application for the same person.</p><div className="form-grid three">
        <Input name="userId" label="Existing MMVY User ID" defaultValue={p.user_id || ''} placeholder="MMVY-00010001" />
        <Input name="firstName" label="First name" defaultValue={p.first_name || ''} required maxLength="100" />
        <Input name="lastName" label="Last name" defaultValue={p.last_name || ''} maxLength="100" />
        <Input name="dateOfBirth" label="Date of birth" type="date" defaultValue={dateValue(p.date_of_birth)} />
        <Select name="gender" label="Gender" values={[['Female', 'Female'], ['Male', 'Male'], ['Other', 'Other']]} selected={p.gender || ''} />
        <Input name="mobile" label="Mobile number" defaultValue={p.mobile || ''} required placeholder="10 digit mobile" maxLength="20" />
        <Input name="email" label="Email" type="email" defaultValue={p.email || ''} placeholder="name@example.com" />
        <Input name="guardianName" label="Parent / guardian name" defaultValue={p.guardian_name || ''} maxLength="150" />
        <Select name="category" label="Category" values={['General', 'OBC', 'SC', 'ST', 'EWS'].map((value) => [value, value])} selected={p.category || ''} />
        <Input name="aadhaarLast4" label="Aadhaar last 4 digits only" defaultValue={p.aadhaar_last4 || ''} placeholder="1234" maxLength="4" />
      </div></section>
      <section className="form-card"><h2>2. Address and Bank Information</h2><p className="form-hint">These fields are common to every connected portal for this user.</p><div className="form-grid three">
        <Input name="addressLine1" label="Address line 1" defaultValue={p.address_line1 || ''} required full maxLength="255" /><Input name="addressLine2" label="Address line 2" defaultValue={p.address_line2 || ''} full maxLength="255" />
        <Input name="villageOrWard" label="Village / Ward" defaultValue={p.village_or_ward || ''} /><Input name="city" label="City / Tehsil" defaultValue={p.city || ''} /><Input name="district" label="District" defaultValue={p.district || ''} />
        <Input name="state" label="State" defaultValue={p.state || 'Madhya Pradesh'} required /><Input name="pincode" label="Pincode" defaultValue={p.pincode || ''} placeholder="6 digits" maxLength="6" /><Input name="bankName" label="Bank name" defaultValue={p.bank_name || ''} />
        <Input name="bankAccountNumber" label="Bank account number" defaultValue={p.bank_account_number || ''} /><Input name="ifscCode" label="IFSC code" defaultValue={p.ifsc_code || ''} maxLength="20" />
      </div></section>
      <section className="form-card"><h2>3. {isPartner ? 'Partner Scheme' : 'MMVY'} Application</h2><div className="form-grid three">
        <Select name="applicationType" label="Application type" values={[['FRESH', 'Fresh'], ['RENEWAL', 'Renewal']]} selected="FRESH" required /><Input name="academicYear" label="Academic year" required placeholder="2026-27" maxLength="20" /><Input name="schemeName" label="Scheme name" defaultValue={isPartner ? 'Partner Education Support' : 'Mukhyamantri Medhavi Vidyarthi Yojana'} required />
        <Input name="instituteName" label="Institute name" required maxLength="255" /><Input name="instituteCode" label="Institute code" maxLength="80" /><Select name="instituteType" label="Institute type" values={categoryButtons.map((value) => [value, value])} />
        <Input name="courseName" label="Course name" required maxLength="255" /><Input name="courseType" label="Course type" placeholder="UG / PG / Diploma" /><Input name="admissionDate" label="Admission date" type="date" />
        <Input name="qualifyingExam" label="Qualifying examination" placeholder="Class 12 / JEE / NEET" /><Input name="qualifyingPercentage" label="Qualifying percentage" type="number" min="0" max="100" step="0.01" placeholder="0 - 100" /><Input name="familyAnnualIncome" label="Family annual income (₹)" type="number" min="0" step="0.01" />
        <div className="checkbox-field"><input id="consentGiven" name="consentGiven" type="checkbox" required /><label htmlFor="consentGiven">I confirm that the information is correct and consent to its use across the connected MMVY, Partner Portal and API Setu services. <span className="required">*</span></label></div>
      </div><div className="form-footer"><button className="primary-btn" type="submit"><i className="fa-solid fa-paper-plane" /> Submit Application</button><button className="ghost-btn" type="button" onClick={() => navigate('home')}>Cancel</button><span className="small-note">No document upload is required in this paper-less prototype.</span></div></section>
    </form>
  </div></main>;
}
