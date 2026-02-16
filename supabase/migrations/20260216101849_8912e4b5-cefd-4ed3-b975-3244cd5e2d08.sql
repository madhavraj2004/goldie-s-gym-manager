
-- Fix handle_new_user to also create member_profiles/trainer_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
BEGIN
  _role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::app_role,
    'member'
  );

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);

  -- Auto-create member or trainer profile
  IF _role = 'member' THEN
    INSERT INTO public.member_profiles (user_id)
    VALUES (NEW.id);
  ELSIF _role = 'trainer' THEN
    INSERT INTO public.trainer_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Fix RLS: Change RESTRICTIVE policies to PERMISSIVE for user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix RLS for profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Fix RLS for member_profiles
DROP POLICY IF EXISTS "Admins full access to member_profiles" ON public.member_profiles;
CREATE POLICY "Admins full access to member_profiles"
  ON public.member_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Members can read own member_profile" ON public.member_profiles;
CREATE POLICY "Members can read own member_profile"
  ON public.member_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can update own member_profile" ON public.member_profiles;
CREATE POLICY "Members can update own member_profile"
  ON public.member_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can read assigned members" ON public.member_profiles;
CREATE POLICY "Trainers can read assigned members"
  ON public.member_profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'trainer'::app_role) AND assigned_trainer_id = auth.uid());

-- Fix RLS for trainer_profiles
DROP POLICY IF EXISTS "Admins full access to trainer_profiles" ON public.trainer_profiles;
CREATE POLICY "Admins full access to trainer_profiles"
  ON public.trainer_profiles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Trainers can read own profile" ON public.trainer_profiles;
CREATE POLICY "Trainers can read own profile"
  ON public.trainer_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Trainers can update own profile" ON public.trainer_profiles;
CREATE POLICY "Trainers can update own profile"
  ON public.trainer_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can read trainer profiles" ON public.trainer_profiles;
CREATE POLICY "Members can read trainer profiles"
  ON public.trainer_profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'member'::app_role));

-- Backfill: create member_profiles for existing members who don't have one
INSERT INTO public.member_profiles (user_id)
SELECT ur.user_id FROM public.user_roles ur
LEFT JOIN public.member_profiles mp ON mp.user_id = ur.user_id
WHERE ur.role = 'member' AND mp.id IS NULL;

-- Backfill: create trainer_profiles for existing trainers who don't have one
INSERT INTO public.trainer_profiles (user_id)
SELECT ur.user_id FROM public.user_roles ur
LEFT JOIN public.trainer_profiles tp ON tp.user_id = ur.user_id
WHERE ur.role = 'trainer' AND tp.id IS NULL;
