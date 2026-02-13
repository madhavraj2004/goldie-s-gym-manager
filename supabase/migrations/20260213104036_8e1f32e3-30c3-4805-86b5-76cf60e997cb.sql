
-- Member profiles with fitness data
CREATE TABLE public.member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric,
  height_cm numeric,
  date_of_birth date,
  gender text,
  emergency_contact text,
  emergency_phone text,
  fitness_goal text,
  medical_notes text,
  assigned_trainer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  membership_status text NOT NULL DEFAULT 'active',
  membership_start date,
  membership_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access to member_profiles"
  ON public.member_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Trainers can read their assigned members
CREATE POLICY "Trainers can read assigned members"
  ON public.member_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'trainer') AND assigned_trainer_id = auth.uid());

-- Members can read own profile
CREATE POLICY "Members can read own member_profile"
  ON public.member_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Members can update own profile (limited fields handled in app)
CREATE POLICY "Members can update own member_profile"
  ON public.member_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_member_profiles_updated_at
  BEFORE UPDATE ON public.member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trainer profiles
CREATE TABLE public.trainer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  specialization text,
  experience_years integer DEFAULT 0,
  bio text,
  certifications text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.trainer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to trainer_profiles"
  ON public.trainer_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Trainers can read own profile"
  ON public.trainer_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Trainers can update own profile"
  ON public.trainer_profiles FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Members can read trainer profiles"
  ON public.trainer_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'member'));

CREATE TRIGGER update_trainer_profiles_updated_at
  BEFORE UPDATE ON public.trainer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
