export const categoryButtons = [
  'Medical Colleges', 'IIT Institutes', 'NIT Institutes', 'IIM Institutes',
  'CLAT(NLIU) Institutes', 'Higher Education Institutes', 'Technical Education Institutes', 'Others'
];

export function readable(value) {
  if (!value) return '—';
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export const dateValue = (value) => (value ? String(value).slice(0, 10) : '');

export function dateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function profileFromForm(formData) {
  const keys = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'mobile', 'email', 'guardianName', 'category', 'aadhaarLast4', 'addressLine1', 'addressLine2', 'villageOrWard', 'city', 'district', 'state', 'pincode', 'bankName', 'bankAccountNumber', 'ifscCode'];
  return Object.fromEntries(keys.map((key) => [key, formData.get(key) || '']));
}
