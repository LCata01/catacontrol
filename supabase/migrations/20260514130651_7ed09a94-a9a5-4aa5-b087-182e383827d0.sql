ALTER TABLE public.profiles DROP CONSTRAINT profiles_username_key;
CREATE UNIQUE INDEX profiles_company_username_key ON public.profiles (company_id, username);