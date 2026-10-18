CREATE TABLE IF NOT EXISTS ota_guest_profiles (
 owner text NOT NULL,
 thread_id text NOT NULL,
 source_key text NOT NULL,
 payload text NOT NULL,
 attempted text NOT NULL DEFAULT '',
 updated text NOT NULL,
 PRIMARY KEY (owner, thread_id, source_key)
);
