-- Exercise types defined by users
CREATE TABLE IF NOT EXISTS exercise_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4ade80',
  default_duration_minutes INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Individual workout entries
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  exercise_type_id INTEGER NOT NULL REFERENCES exercise_types(id),
  date TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_email, date);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);
CREATE INDEX IF NOT EXISTS idx_exercise_types_user ON exercise_types(created_by);
