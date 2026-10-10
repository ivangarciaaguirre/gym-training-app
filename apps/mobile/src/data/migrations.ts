// Append migrations; never edit an applied migration or reset user data on failure.
export const migrations = [
  `CREATE TABLE records (
    kind TEXT NOT NULL CHECK (kind IN ('routine', 'workout')),
    id TEXT NOT NULL, revision INTEGER NOT NULL CHECK (revision > 0),
    data TEXT NOT NULL CHECK (json_valid(data)),
    PRIMARY KEY (kind, id)
  );
  CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  CREATE TABLE outbox (
    kind TEXT NOT NULL, id TEXT NOT NULL, owner_id TEXT NOT NULL,
    revision INTEGER NOT NULL, data TEXT NOT NULL CHECK (json_valid(data)),
    PRIMARY KEY (kind, id, owner_id),
    FOREIGN KEY (kind, id) REFERENCES records(kind, id)
  );`,
];
