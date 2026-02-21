import { Hono } from 'hono';
import { getWorkouts, createWorkout, updateWorkout, deleteWorkout } from '../db/queries';

type Env = { Bindings: { DB: any }; Variables: { userEmail: string } };

const app = new Hono<Env>();

app.get('/', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!from || !to) return c.json({ error: 'from and to query params required' }, 400);
  const result = await getWorkouts(c.env.DB, c.var.userEmail, from, to);
  return c.json(result.results);
});

app.post('/', async (c) => {
  const data = await c.req.json();
  if (!data.exercise_type_id || !data.date || !data.duration_minutes) {
    return c.json({ error: 'exercise_type_id, date, and duration_minutes are required' }, 400);
  }
  const result = await createWorkout(c.env.DB, c.var.userEmail, data);
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const result = await updateWorkout(c.env.DB, id, c.var.userEmail, data);
  if (!result) return c.json({ error: 'Not found or no changes' }, 404);
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await deleteWorkout(c.env.DB, id, c.var.userEmail);
  return c.json({ ok: true });
});

export default app;
