ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, full_name, avatar_url, is_public, created_at, updated_at)
  ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE (is_public, updated_at)
  ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid()
      AND profile.is_admin = true
  );
$function$;

ALTER FUNCTION public.is_current_user_admin() OWNER TO postgres;
REVOKE ALL PRIVILEGES ON FUNCTION public.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.countries, public.currencies, public.currencycountry
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.countries, public.currencies, public.currencycountry
  TO authenticated;

REVOKE ALL PRIVILEGES ON SEQUENCE public.countries_countryid_seq, public.currencies_currencyid_seq
  FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT
  ON SEQUENCE public.countries_countryid_seq, public.currencies_currencyid_seq
  TO authenticated;

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencycountry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all actions" ON public.countries;
DROP POLICY IF EXISTS "Allow all actions" ON public.currencies;
DROP POLICY IF EXISTS "Allow all actions" ON public.currencycountry;

DROP POLICY IF EXISTS "Authenticated users can read countries" ON public.countries;
CREATE POLICY "Authenticated users can read countries"
  ON public.countries
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert countries" ON public.countries;
CREATE POLICY "Admins can insert countries"
  ON public.countries
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update countries" ON public.countries;
CREATE POLICY "Admins can update countries"
  ON public.countries
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete countries" ON public.countries;
CREATE POLICY "Admins can delete countries"
  ON public.countries
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can read currencies" ON public.currencies;
CREATE POLICY "Authenticated users can read currencies"
  ON public.currencies
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert currencies" ON public.currencies;
CREATE POLICY "Admins can insert currencies"
  ON public.currencies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update currencies" ON public.currencies;
CREATE POLICY "Admins can update currencies"
  ON public.currencies
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete currencies" ON public.currencies;
CREATE POLICY "Admins can delete currencies"
  ON public.currencies
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());

DROP POLICY IF EXISTS "Authenticated users can read currencycountry" ON public.currencycountry;
CREATE POLICY "Authenticated users can read currencycountry"
  ON public.currencycountry
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can insert currencycountry" ON public.currencycountry;
CREATE POLICY "Admins can insert currencycountry"
  ON public.currencycountry
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can update currencycountry" ON public.currencycountry;
CREATE POLICY "Admins can update currencycountry"
  ON public.currencycountry
  FOR UPDATE
  TO authenticated
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());

DROP POLICY IF EXISTS "Admins can delete currencycountry" ON public.currencycountry;
CREATE POLICY "Admins can delete currencycountry"
  ON public.currencycountry
  FOR DELETE
  TO authenticated
  USING (public.is_current_user_admin());