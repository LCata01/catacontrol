
-- Migrate existing TEMPLO user emails: <username>@cata.local -> <username>@templo.cata.local
DO $$
DECLARE
  templo_id uuid := (SELECT id FROM public.companies WHERE code = 'TEMPLO');
  rec record;
BEGIN
  FOR rec IN
    SELECT u.id, u.email, p.username
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE p.company_id = templo_id
      AND u.email LIKE '%@cata.local'
      AND u.email NOT LIKE '%@templo.cata.local'
      AND u.email NOT LIKE '%@platform.cata.local'
  LOOP
    UPDATE auth.users
    SET email = rec.username || '@templo.cata.local'
    WHERE id = rec.id;

    UPDATE auth.identities
    SET identity_data = identity_data
        || jsonb_build_object('email', rec.username || '@templo.cata.local')
    WHERE user_id = rec.id AND provider = 'email';
  END LOOP;
END $$;
