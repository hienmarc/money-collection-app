-- =============================================================================
-- Migration: User Profiles & Public/Private Visibility
-- =============================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name text,
    avatar_url text,
    is_public boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles OWNER TO postgres;

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

-- 2. Automatically sync new users from auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, avatar_url, is_public)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill profiles for existing users
INSERT INTO public.profiles (id, full_name, avatar_url, is_public)
SELECT
    id,
    COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email, '@', 1)),
    raw_user_meta_data->>'avatar_url',
    true
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Row Level Security on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles
    FOR SELECT
    USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 5. Update Row Level Security on banknotes to support public profile access
DROP POLICY IF EXISTS "Private item acces" ON public.banknotes;
DROP POLICY IF EXISTS "Banknotes are viewable by owner or if owner is public" ON public.banknotes;

CREATE POLICY "Banknotes are viewable by owner or if owner is public"
    ON public.banknotes
    FOR SELECT
    USING (
        ownerid = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = banknotes.ownerid AND profiles.is_public = true
        )
    );

DROP POLICY IF EXISTS "Users can insert own banknotes" ON public.banknotes;
CREATE POLICY "Users can insert own banknotes"
    ON public.banknotes
    FOR INSERT
    WITH CHECK (ownerid = auth.uid());

DROP POLICY IF EXISTS "Users can update own banknotes" ON public.banknotes;
CREATE POLICY "Users can update own banknotes"
    ON public.banknotes
    FOR UPDATE
    USING (ownerid = auth.uid())
    WITH CHECK (ownerid = auth.uid());

DROP POLICY IF EXISTS "Users can delete own banknotes" ON public.banknotes;
CREATE POLICY "Users can delete own banknotes"
    ON public.banknotes
    FOR DELETE
    USING (ownerid = auth.uid());
