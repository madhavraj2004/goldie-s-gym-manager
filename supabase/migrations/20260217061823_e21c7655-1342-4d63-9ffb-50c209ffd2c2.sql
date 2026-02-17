
-- =============================================
-- 1. FIX RLS: Drop all RESTRICTIVE policies and recreate as PERMISSIVE
-- =============================================

-- user_roles
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- member_profiles
DROP POLICY IF EXISTS "Admins full access to member_profiles" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can read own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Members can update own member_profile" ON public.member_profiles;
DROP POLICY IF EXISTS "Trainers can read assigned members" ON public.member_profiles;

CREATE POLICY "Admins full access to member_profiles" ON public.member_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Members can read own member_profile" ON public.member_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members can update own member_profile" ON public.member_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Trainers can read assigned members" ON public.member_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'trainer'::app_role) AND assigned_trainer_id = auth.uid());

-- trainer_profiles
DROP POLICY IF EXISTS "Admins full access to trainer_profiles" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Trainers can read own profile" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Trainers can update own profile" ON public.trainer_profiles;
DROP POLICY IF EXISTS "Members can read trainer profiles" ON public.trainer_profiles;

CREATE POLICY "Admins full access to trainer_profiles" ON public.trainer_profiles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Trainers can read own profile" ON public.trainer_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Trainers can update own profile" ON public.trainer_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members can read trainer profiles" ON public.trainer_profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'member'::app_role));

-- =============================================
-- 2. ATTENDANCE TABLE
-- =============================================
CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own attendance" ON public.attendance FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Members can insert own attendance" ON public.attendance FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members can update own attendance" ON public.attendance FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins full access attendance" ON public.attendance FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Trainers can read assigned member attendance" ON public.attendance FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'trainer'::app_role) AND 
  EXISTS (SELECT 1 FROM public.member_profiles WHERE member_profiles.user_id = attendance.user_id AND member_profiles.assigned_trainer_id = auth.uid())
);

CREATE INDEX idx_attendance_user_date ON public.attendance (user_id, check_in);

-- =============================================
-- 3. PAYMENTS TABLE
-- =============================================
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'paid',
  method text DEFAULT 'cash',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own payments" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins full access payments" ON public.payments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_payments_user ON public.payments (user_id);
CREATE INDEX idx_payments_status ON public.payments (status);

-- =============================================
-- 4. NOTIFICATIONS TABLE (for due messages)
-- =============================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins full access notifications" ON public.notifications FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read);

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
