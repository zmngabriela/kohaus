-- D1: separate database/binding for Preview and Production. No contact details stored.
CREATE TABLE IF NOT EXISTS request_limits (
 key TEXT PRIMARY KEY,
 window INTEGER NOT NULL,
 count INTEGER NOT NULL
);
