
CREATE OR REPLACE FUNCTION public.verify_company_password(_code text, _password text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies
    WHERE code = upper(_code)
      AND active = true
      AND password_hash = extensions.crypt(_password, password_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.create_company_secure(_name text, _code text, _password text)
RETURNS public.companies
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  c public.companies;
BEGIN
  INSERT INTO public.companies (name, code, password_hash)
  VALUES (_name, upper(_code), extensions.crypt(_password, extensions.gen_salt('bf', 10)))
  RETURNING * INTO c;
  RETURN c;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_company_password(_id uuid, _password text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public, extensions
AS $$
  UPDATE public.companies
  SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf', 10))
  WHERE id = _id;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_company_password(text, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_company_secure(text, text, text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_company_password(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_company_password(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_company_secure(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_company_password(uuid, text) TO service_role;
