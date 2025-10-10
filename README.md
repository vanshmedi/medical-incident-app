# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
## Setup for Medical Incident Reporting System

1. Create a `.env` file with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Run the app:

```
npm install
npm run dev
```

3. Supabase SQL schema (execute in Supabase SQL editor):

```sql
-- users are managed by Supabase Auth; store role in auth users metadata or a profiles table

create table if not exists public.patients (
  patient_id text primary key,
  full_name text not null,
  date_of_birth date not null,
  gender text not null
);

create table if not exists public.devices (
  device_id text primary key,
  device_name text not null,
  manufacturer text not null,
  model text not null
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  reporter_id uuid not null references auth.users(id),
  incident_date date,
  incident_time time,
  patient_id text references public.patients(patient_id),
  device_id text references public.devices(device_id),
  device_report_details text,
  patient_symptoms text,
  advice_given text,
  concerned_department text
);

-- Enable RLS
alter table public.reports enable row level security;
alter table public.patients enable row level security;
alter table public.devices enable row level security;

-- Optional: store readable profile info for UI joins
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text
);

-- Optional: function to expose auth.users emails to authenticated admins/reporters
-- This returns only id/email for provided IDs. Restrict execution via RLS on reports or via a SECURITY DEFINER wrapper if needed.
create or replace function public.get_user_emails(ids uuid[])
returns table (id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select u.id, u.email
  from auth.users u
  where u.id = any(ids);
$$;

-- Policies: reporters can insert their own reports and read their own; admins can read all
create policy if not exists reports_insert_self on public.reports
  for insert to authenticated
  with check (auth.uid() = reporter_id);

-- Select policy: admin can read all; reporter can read own
create policy if not exists reports_select_all_for_admin on public.reports
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or auth.uid() = reporter_id
  );

-- Allow read-only access to patients/devices to authenticated users
create policy if not exists patients_ro on public.patients
  for select to authenticated using (true);
create policy if not exists devices_ro on public.devices
  for select to authenticated using (true);

-- Sample data
insert into public.patients (patient_id, full_name, date_of_birth, gender) values
  ('P12345', 'John Doe', '1980-05-05', 'Male')
on conflict do nothing;

insert into public.devices (device_id, device_name, manufacturer, model) values
  ('D-ECG-08', 'Electrocardiogram', 'Acme MedTech', 'ECG-08')
on conflict do nothing;
```











### Roles
Store role in the user's `app_metadata.role` as `reporter` or `admin`. The app routes based on this value.


Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
