BEGIN;

CREATE SEQUENCE IF NOT EXISTS mmvy_shared_user_ref_seq START WITH 10001;
CREATE SEQUENCE IF NOT EXISTS mmvy_shared_application_ref_seq START WITH 50001;

CREATE TABLE IF NOT EXISTS mmvy_users (
  user_id VARCHAR(13) PRIMARY KEY CHECK (user_id ~ '^MMVY-[0-9]{8}$'),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20) CHECK (gender IS NULL OR gender IN ('Female', 'Male', 'Other')),
  mobile VARCHAR(20) NOT NULL CHECK (mobile ~ '^[0-9]{10}$'),
  email VARCHAR(254),
  guardian_name VARCHAR(150),
  category VARCHAR(20) CHECK (category IS NULL OR category IN ('General', 'OBC', 'SC', 'ST', 'EWS')),
  domicile_state VARCHAR(100),
  aadhaar_last4 CHAR(4) CHECK (aadhaar_last4 IS NULL OR aadhaar_last4 ~ '^[0-9]{4}$'),
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  village_or_ward VARCHAR(150),
  city VARCHAR(150),
  district VARCHAR(150),
  state VARCHAR(100),
  pincode CHAR(6) CHECK (pincode IS NULL OR pincode ~ '^[0-9]{6}$'),
  bank_name VARCHAR(150),
  bank_account_number VARCHAR(40),
  ifsc_code VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mmvy_applications (
  application_id VARCHAR(12) PRIMARY KEY CHECK (application_id ~ '^APP-[0-9]{8}$'),
  user_id VARCHAR(13) NOT NULL REFERENCES mmvy_users(user_id) ON DELETE RESTRICT,
  source_portal VARCHAR(30) NOT NULL CHECK (source_portal IN ('MMVY', 'SERVICE_PORTAL')),
  application_type VARCHAR(20) NOT NULL DEFAULT 'FRESH' CHECK (application_type IN ('FRESH', 'RENEWAL')),
  scheme_name VARCHAR(255) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  institute_name VARCHAR(255) NOT NULL,
  institute_code VARCHAR(80),
  institute_type VARCHAR(100),
  course_name VARCHAR(255) NOT NULL,
  course_type VARCHAR(100),
  admission_date DATE,
  qualifying_exam VARCHAR(150),
  qualifying_percentage NUMERIC(5, 2) CHECK (qualifying_percentage IS NULL OR qualifying_percentage BETWEEN 0 AND 100),
  family_annual_income NUMERIC(14, 2) CHECK (family_annual_income IS NULL OR family_annual_income >= 0),
  consent_given BOOLEAN NOT NULL CHECK (consent_given),
  status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED')),
  extra_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mmvy_portal_access_events (
  event_id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(13) NOT NULL REFERENCES mmvy_users(user_id) ON DELETE RESTRICT,
  consumer VARCHAR(30) NOT NULL CHECK (consumer IN ('SERVICE_PORTAL', 'API_SETU')),
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('PROFILE_LOOKUP', 'SHARED_PROFILE_LOOKUP')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mmvy_applications_user_submitted_idx
  ON mmvy_applications (user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS mmvy_users_updated_at_idx
  ON mmvy_users (updated_at DESC);
CREATE INDEX IF NOT EXISTS mmvy_portal_access_events_user_created_idx
  ON mmvy_portal_access_events (user_id, created_at DESC);

DROP TRIGGER IF EXISTS mmvy_users_set_updated_at ON mmvy_users;
DROP FUNCTION IF EXISTS set_mmvy_users_updated_at();

SELECT setval(
  'mmvy_shared_user_ref_seq',
  GREATEST(
    10001,
    COALESCE((SELECT MAX(SUBSTRING(user_id FROM '^MMVY-([0-9]{8})$')::BIGINT) FROM mmvy_users), 10000) + 1
  ),
  false
);

SELECT setval(
  'mmvy_shared_application_ref_seq',
  GREATEST(
    50001,
    COALESCE((SELECT MAX(SUBSTRING(application_id FROM '^APP-([0-9]{8})$')::BIGINT) FROM mmvy_applications), 50000) + 1
  ),
  false
);

COMMIT;
