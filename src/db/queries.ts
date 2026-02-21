export type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
};

type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
};

type D1Result<T = unknown> = {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
};

// Exercise Types

export async function getExerciseTypes(db: D1Database, userEmail: string) {
  return db
    .prepare('SELECT * FROM exercise_types WHERE created_by = ? ORDER BY sort_order, name')
    .bind(userEmail)
    .all();
}

export async function createExerciseType(
  db: D1Database,
  userEmail: string,
  name: string,
  color: string,
  defaultDuration: number | null
) {
  return db
    .prepare('INSERT INTO exercise_types (name, color, default_duration_minutes, created_by) VALUES (?, ?, ?, ?) RETURNING *')
    .bind(name, color, defaultDuration, userEmail)
    .first();
}

export async function updateExerciseType(
  db: D1Database,
  id: number,
  userEmail: string,
  data: { name?: string; color?: string; sort_order?: number; default_duration_minutes?: number | null }
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
  if (data.sort_order !== undefined) { fields.push('sort_order = ?'); values.push(data.sort_order); }
  if (data.default_duration_minutes !== undefined) { fields.push('default_duration_minutes = ?'); values.push(data.default_duration_minutes); }

  if (fields.length === 0) return null;

  values.push(id, userEmail);
  return db
    .prepare(`UPDATE exercise_types SET ${fields.join(', ')} WHERE id = ? AND created_by = ? RETURNING *`)
    .bind(...values)
    .first();
}

export async function deleteExerciseType(db: D1Database, id: number, userEmail: string) {
  return db
    .prepare('DELETE FROM exercise_types WHERE id = ? AND created_by = ?')
    .bind(id, userEmail)
    .run();
}

// Workouts

export async function getWorkouts(db: D1Database, userEmail: string, from: string, to: string) {
  return db
    .prepare(
      `SELECT w.*, et.name as exercise_type_name, et.color as exercise_type_color
       FROM workouts w
       JOIN exercise_types et ON w.exercise_type_id = et.id
       WHERE w.user_email = ? AND w.date >= ? AND w.date <= ?
       ORDER BY w.date, et.sort_order`
    )
    .bind(userEmail, from, to)
    .all();
}

export async function createWorkout(
  db: D1Database,
  userEmail: string,
  data: { exercise_type_id: number; date: string; duration_minutes: number; notes?: string }
) {
  return db
    .prepare(
      `INSERT INTO workouts (user_email, exercise_type_id, date, duration_minutes, notes)
       VALUES (?, ?, ?, ?, ?) RETURNING *`
    )
    .bind(userEmail, data.exercise_type_id, data.date, data.duration_minutes, data.notes || null)
    .first();
}

export async function updateWorkout(
  db: D1Database,
  id: number,
  userEmail: string,
  data: { exercise_type_id?: number; date?: string; duration_minutes?: number; notes?: string }
) {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.exercise_type_id !== undefined) { fields.push('exercise_type_id = ?'); values.push(data.exercise_type_id); }
  if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
  if (data.duration_minutes !== undefined) { fields.push('duration_minutes = ?'); values.push(data.duration_minutes); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes); }

  if (fields.length === 0) return null;

  fields.push("updated_at = datetime('now')");
  values.push(id, userEmail);
  return db
    .prepare(`UPDATE workouts SET ${fields.join(', ')} WHERE id = ? AND user_email = ? RETURNING *`)
    .bind(...values)
    .first();
}

export async function deleteWorkout(db: D1Database, id: number, userEmail: string) {
  return db
    .prepare('DELETE FROM workouts WHERE id = ? AND user_email = ?')
    .bind(id, userEmail)
    .run();
}
