
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'catapein@platform.cata.local') THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    'catapein@platform.cata.local',
    crypt('Amparo2026@', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"catapein"}'::jsonb,
    false
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'catapein@platform.cata.local'),
    'email',
    new_user_id::text,
    now(), now(), now()
  );

  INSERT INTO public.profiles (id, username, display_name, company_id)
  VALUES (new_user_id, 'catapein', 'Platform Admin', NULL);

  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (new_user_id, 'platform_admin'::app_role, NULL);
END $$;
