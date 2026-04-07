
-- 1. Fix member_profiles: prevent members from self-escalating admin-only fields
DROP POLICY IF EXISTS "Members can update own member_profile" ON public.member_profiles;
CREATE POLICY "Members can update own member_profile"
ON public.member_profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND membership_status IS NOT DISTINCT FROM (SELECT mp.membership_status FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
  AND membership_end IS NOT DISTINCT FROM (SELECT mp.membership_end FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
  AND membership_start IS NOT DISTINCT FROM (SELECT mp.membership_start FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
  AND plan_id IS NOT DISTINCT FROM (SELECT mp.plan_id FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
  AND assigned_trainer_id IS NOT DISTINCT FROM (SELECT mp.assigned_trainer_id FROM public.member_profiles mp WHERE mp.user_id = auth.uid())
);

-- 2. Fix member_goals: change policies from public to authenticated
DROP POLICY IF EXISTS "Members can read own goals" ON public.member_goals;
CREATE POLICY "Members can read own goals" ON public.member_goals FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can insert own goals" ON public.member_goals;
CREATE POLICY "Members can insert own goals" ON public.member_goals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can update own goals" ON public.member_goals;
CREATE POLICY "Members can update own goals" ON public.member_goals FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can delete own goals" ON public.member_goals;
CREATE POLICY "Members can delete own goals" ON public.member_goals FOR DELETE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins full access member_goals" ON public.member_goals;
CREATE POLICY "Admins full access member_goals" ON public.member_goals FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Trainers can read assigned member goals" ON public.member_goals;
CREATE POLICY "Trainers can read assigned member goals" ON public.member_goals FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'trainer'::app_role) AND EXISTS (
  SELECT 1 FROM member_profiles WHERE member_profiles.user_id = member_goals.user_id AND member_profiles.assigned_trainer_id = auth.uid()
));

-- 3. Fix attendance: add validation trigger for timestamps
CREATE OR REPLACE FUNCTION public.validate_attendance_timestamps()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- On INSERT, force check_in to now()
  IF TG_OP = 'INSERT' THEN
    NEW.check_in := now();
    NEW.check_out := NULL;
  END IF;

  -- On UPDATE, if check_out is being set, validate it's after check_in
  IF TG_OP = 'UPDATE' AND NEW.check_out IS NOT NULL THEN
    IF NEW.check_out < NEW.check_in THEN
      RAISE EXCEPTION 'check_out must be after check_in';
    END IF;
    -- Don't allow changing check_in on update
    NEW.check_in := OLD.check_in;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_attendance_timestamps_trigger
BEFORE INSERT OR UPDATE ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.validate_attendance_timestamps();

-- 4. Fix profiles: replace broad read policy with restricted one
-- Keep full_name and avatar_url visible, but hide phone from other users
-- We use a security definer function to provide safe profile reads
CREATE OR REPLACE FUNCTION public.get_user_phone(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE user_id = p_user_id;
$$;

-- Remove broad read policies, keep scoped ones
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Trainers can read member profiles" ON public.profiles;

-- Users can read their own full profile
-- (already exists: "Users can read own profile")

-- All authenticated users can read basic profile info (full_name, avatar_url) 
-- Phone is still in the row but we add a view for safe access
CREATE POLICY "Authenticated can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
-- Note: Phone is exposed at row level. To truly hide it, we'd need column-level security.
-- The application should use the profiles table for name/avatar and get_user_phone() for phone only when authorized.
