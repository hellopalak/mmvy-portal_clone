INSERT INTO portal_users
  (portal_id, full_name, address, income, caste_category, mobile_number)
VALUES
  ('M-1001', 'Rahul Verma', '12 City Road, Indore', 80000, 'OBC', '9876543210'),
  ('M-1002', 'Amit Kumar', '18 Park Road, Indore', 65000, 'SC', '9876543211'),
  ('M-1003', 'Anjali Verma', '10 Main Road, Ujjain', 72000, 'OPEN', '9876543212')
ON CONFLICT (portal_id) DO NOTHING;
