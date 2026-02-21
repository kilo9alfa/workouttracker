import { Hono } from 'hono';
import { getExerciseTypes, createExerciseType, updateExerciseType, deleteExerciseType } from '../db/queries';

type Env = { Bindings: { DB: any }; Variables: { userEmail: string } };

const app = new Hono<Env>();

app.get('/', async (c) => {
  const result = await getExerciseTypes(c.env.DB, c.var.userEmail);
  return c.json(result.results);
});

app.post('/', async (c) => {
  const { name, color } = await c.req.json();
  if (!name) return c.json({ error: 'name is required' }, 400);
  const result = await createExerciseType(c.env.DB, c.var.userEmail, name, color || '#4ade80');
  return c.json(result, 201);
});

app.put('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = await c.req.json();
  const result = await updateExerciseType(c.env.DB, id, c.var.userEmail, data);
  if (!result) return c.json({ error: 'Not found or no changes' }, 404);
  return c.json(result);
});

app.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await deleteExerciseType(c.env.DB, id, c.var.userEmail);
  return c.json({ ok: true });
});

export default app;
