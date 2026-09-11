import { api } from '../api';
import { Input } from './FormFields';
import { dateValue, profileFromForm } from '../utils';

export default function ProfileEditForm({ profile, onCancel, onSaved, setFlash }) {
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      const result = await api(`/api/mmvy/users/${encodeURIComponent(profile.user_id)}`, { method: 'PATCH', body: JSON.stringify(profileFromForm(new FormData(form))) });
      onSaved({ ...profile, ...result.data });
    } catch (error) { setFlash(error.message, 'error'); } finally { button.disabled = false; }
  }
  return <section className="form-card"><h2>Update User Information</h2><p className="form-hint">This form calls the MMVY update endpoint: <code>PATCH /api/mmvy/users/{profile.user_id}</code></p><form onSubmit={submit}><div className="form-grid three">
    <Input name="firstName" label="First name" defaultValue={profile.first_name || ''} required /><Input name="lastName" label="Last name" defaultValue={profile.last_name || ''} /><Input name="mobile" label="Mobile number" defaultValue={profile.mobile || ''} required />
    <Input name="email" label="Email" type="email" defaultValue={profile.email || ''} /><Input name="guardianName" label="Parent / guardian" defaultValue={profile.guardian_name || ''} /><Input name="dateOfBirth" label="Date of birth" type="date" defaultValue={dateValue(profile.date_of_birth)} />
    <Input name="addressLine1" label="Address line 1" defaultValue={profile.address_line1 || ''} required full /><Input name="addressLine2" label="Address line 2" defaultValue={profile.address_line2 || ''} full />
    <Input name="villageOrWard" label="Village / Ward" defaultValue={profile.village_or_ward || ''} /><Input name="city" label="City / Tehsil" defaultValue={profile.city || ''} /><Input name="district" label="District" defaultValue={profile.district || ''} />
    <Input name="state" label="State" defaultValue={profile.state || 'Madhya Pradesh'} required /><Input name="pincode" label="Pincode" defaultValue={profile.pincode || ''} maxLength="6" /><Input name="bankName" label="Bank name" defaultValue={profile.bank_name || ''} />
    <Input name="bankAccountNumber" label="Bank account number" defaultValue={profile.bank_account_number || ''} /><Input name="ifscCode" label="IFSC code" defaultValue={profile.ifsc_code || ''} />
  </div><div className="form-footer"><button className="primary-btn" type="submit">Save Changes</button><button className="ghost-btn" type="button" onClick={onCancel}>Cancel</button></div></form></section>;
}
