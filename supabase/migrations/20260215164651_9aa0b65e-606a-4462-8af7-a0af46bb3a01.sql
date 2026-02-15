-- Fix user_roles policies: drop RESTRICTIVE ones and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Also fix profiles policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Fix member_profiles policies
DROP POLICY IF EXISTS "Admins full access to member_profiles" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can read own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can update own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Trainers can read assigned members" ON public.member_profiles;

CREATE POLICY "Admins full access to member_profiles"
ON public.member_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Members can read own member_profile"
ON public.member_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can update own member_profile"
ON public.member_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Trainers can read assigned members"
ON public.member_profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'trainer'::app_role) AND assigned_trainer_id = auth.uid());

-- Fix trainer_profiles policies
DROP POLICY IF EXISTS "Admins full access to trainer_profiles" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Trainers can read own profile" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Trainers can update own profile" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Members can read trainer profiles" ON public.trainer_profiles;

CREATE POLICY "Admins full access to trainer_profiles"
ON public.trainer_profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Trainers can read own profile"
ON public.trainer_profiles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Trainers can update own profile"
ON public.trainer_profiles FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Members can read trainer profiles"
ON public.trainer_profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'member'::app_role));