# Totally Gone Bananas 🍌

A banana-recipe site where anyone can share a recipe (with photos, video, ingredients, and steps), save favorites, and rate what they cook. Editors review submissions before they go live.

Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, and **Supabase** (Postgres, Auth, Storage).

## What's here

| Page | What it does |
| --- | --- |
| `/` | Home: category stickers, newest recipes, recipe of the day |
| `/recipes` | Browse with search, category, time, diet tags, and sort |
| `/recipes/[slug]` | Recipe page: photo/video gallery, servings scaler, ingredient checklist, steps with media, ratings and tips |
| `/recipes/new` | **The submission form.** Share this link with contributors |
| `/recipes/[slug]/edit` | Edit a recipe (authors, while unpublished; editors, always) |
| `/profile` | "My Banana Stand": saved recipes, my recipes with review status, cooking history, level and points |
| `/profile/settings` | Name, username, bio, avatar |
| `/admin/review` | Review queue for editors: publish or send back with a note |
| `/login` | Passwordless email sign-in (plus optional Google) |

### How recipe submission works

1. A signed-in user opens `/recipes/new` and fills in five sections: basics, photos & video, ingredients, steps, and details.
2. Photos and videos upload **directly from the browser to Supabase Storage** into a folder named after the user's ID. Nothing large passes through the Next.js server.
3. On submit, a server action validates everything with zod, checks that every media path belongs to the user, and saves the recipe.
4. **Members'** recipes go to `pending`. **Editors and admins** can publish directly.
5. Editors see pending recipes at `/admin/review`, then publish them or send them back with a note.

The form autosaves to the browser as you type, so a closed tab doesn't lose work. You can press Enter to add ingredient rows and paste whole lists into ingredients or steps.

### Security model

All access rules live in the database as Row Level Security policies (`supabase/migrations/`), so they hold no matter how the data is accessed:

- Anyone can read published recipes. Drafts and pending recipes are visible only to their author and editors.
- Members can create drafts and pending recipes, but never publish or edit a published recipe.
- Saves are private. Ratings and tips are public on published recipes.
- Users can only upload into their own Storage folder.
- Nobody can change their own role; only admins can.

## Setup

You need **Node.js 20.9+** and a free **[Supabase](https://supabase.com)** project.

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Create the database

In your Supabase project, open **SQL Editor** and run these two files in order:

1. `supabase/migrations/20260927000000_init.sql` (tables, security rules, storage buckets)
2. `supabase/seed.sql` (six categories and 22 starter recipes; optional)

Or, with the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref your-project-ref
supabase db push
```

Then paste `supabase/seed.sql` into the SQL Editor if you want the starter recipes.

### 3. Configure environment variables

In **Project Settings → API**, copy the project URL and the anon (publishable) key into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Configure sign-in

In **Authentication → URL Configuration**:

- **Site URL:** `http://localhost:3000` (your real domain in production)
- **Redirect URLs:** add `http://localhost:3000/auth/callback` and `https://your-domain.com/auth/callback`

Email magic links work out of the box. For Google, enable it under **Authentication → Providers**, then set `NEXT_PUBLIC_AUTH_GOOGLE=true`.

> The built-in Supabase email sender is rate-limited and meant for testing. Before launch, add your own SMTP provider under **Authentication → Emails**.

### 5. Run it

```bash
npm run dev
```

Open http://localhost:3000, sign in, and you'll have a member account.

### 6. Make yourself an admin

After signing in once, run this in the SQL Editor with your email:

```sql
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Refresh the site. You'll see **Review queue** in the navigation, a **Publish** button on the form, and a **Copy the submission link** button on your profile. Use `'editor'` instead of `'admin'` for helpers who should review recipes but not manage roles.

## Put it on GitHub

```bash
git init
git add .
git commit -m "Initial commit: Totally Gone Bananas"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/totally-gone-bananas.git
git push -u origin main
```

`.env.local` is ignored by git, so your keys stay private. The included GitHub Actions workflow runs lint, type checks, and a production build on every push and pull request.

## Deploy

The easiest route is [Vercel](https://vercel.com/new): import the GitHub repo, add the environment variables from step 3 (with `NEXT_PUBLIC_SITE_URL` set to your real domain), and deploy. Then add your production `/auth/callback` URL in Supabase (step 4).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types and run TypeScript |
| `npm run db:types` | Generate exact database types from your linked Supabase project |

## Project layout

```
src/
  app/             Pages and routes (App Router)
  actions/         Server actions: recipes, saves/ratings, profile
  components/      UI, including RecipeForm (the submission form)
  lib/             Supabase clients, queries, validation, helpers
  proxy.ts         Refreshes the session; guards signed-in-only pages
supabase/
  migrations/      Database schema and security policies
  seed.sql         Starter categories and recipes
prototype/
  index.html       The original single-file prototype, for reference
```

## Roadmap

These features exist in `prototype/index.html` and are ready to port next:

- **Cook Mode:** full-screen, one step at a time, screen stays awake, with **tap-to-start timers** (`lib/scale.ts` already detects the durations)
- **Pantry Matcher:** pick ingredients you have, see what you can make
- **Weekly Challenge:** a theme each week with a photo gallery and votes (needs `challenges`, `challenge_entries`, `votes` tables)
- **Quiz:** "What banana recipe are you?" with a shareable result card
- **Badges and streaks:** visit streaks, milestone badges, and the banana-ripeness tracker
- **Boards:** organize saved recipes into named collections
- **Public profiles** at `/u/[username]` showing someone's published recipes
- **Banana Spin** and the daily banana fact on the homepage

Housekeeping worth doing as the site grows:

- Clean up orphaned uploads (files uploaded to a form that was never submitted), e.g. with a scheduled Supabase Edge Function
- Email the author when their recipe is published or sent back
- Add automated tests (Playwright for the submission flow; SQL tests for the security policies)
