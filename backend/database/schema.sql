CREATE TABLE IF NOT EXISTS portal_users (
  portal_id VARCHAR PRIMARY KEY,
  full_name VARCHAR,
  address VARCHAR,
  income NUMERIC,
  caste_category VARCHAR,
  mobile_number VARCHAR,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION notify_mmvy_cdc()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'mmvy_cdc_channel',
    json_build_object(
      'operation', TG_OP,
      'old_data', CASE
        WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD)
        ELSE NULL
      END,
      'new_data', CASE
        WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW)
        ELSE NULL
      END
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS mmvy_portal_users_cdc ON portal_users;

CREATE TRIGGER mmvy_portal_users_cdc
AFTER INSERT OR UPDATE OR DELETE
ON portal_users
FOR EACH ROW
EXECUTE FUNCTION notify_mmvy_cdc();
