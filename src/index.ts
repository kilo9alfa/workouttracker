import { Hono } from 'hono';
import { cors } from 'hono/cors';
import exerciseTypesApi from './api/exercise-types';
import workoutsApi from './api/workouts';

type Env = {
  Bindings: { DB: any; ASSETS: { fetch: typeof fetch } };
  Variables: { userEmail: string };
};

const app = new Hono<Env>();

app.use('/workout/api/*', cors());

// Auth middleware — reads Cloudflare Access email header
app.use('/workout/api/*', async (c, next) => {
  const email =
    c.req.header('Cf-Access-Authenticated-User-Email') ||
    c.req.header('cf-access-authenticated-user-email');

  if (!email) {
    // In local dev, allow a fallback
    const devEmail = c.req.header('X-Dev-Email');
    if (devEmail) {
      c.set('userEmail', devEmail);
      return next();
    }
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userEmail', email);
  return next();
});

// API routes
app.route('/workout/api/exercise-types', exerciseTypesApi);
app.route('/workout/api/workouts', workoutsApi);

app.get('/workout/api/me', (c) => {
  return c.json({ email: c.var.userEmail });
});

// Serve static assets for /workout paths
app.get('/workout', (c) => c.redirect('/workout/'));
app.get('/workout/*', async (c) => {
  // Strip /workout prefix for asset lookup
  const path = c.req.path.replace(/^\/workout/, '') || '/';
  const url = new URL(c.req.url);
  url.pathname = path;
  const assetResponse = await c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  // If asset not found, serve index.html (SPA fallback)
  if (assetResponse.status === 404) {
    url.pathname = '/';
    return c.env.ASSETS.fetch(new Request(url.toString(), c.req.raw));
  }
  return assetResponse;
});

export default app;
