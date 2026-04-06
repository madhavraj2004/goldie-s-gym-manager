
CREATE TABLE public.member_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'general',
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT DEFAULT '',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  target_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.member_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read own goals" ON public.member_goals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Members can insert own goals" ON public.member_goals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Members can update own goals" ON public.member_goals
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Members can delete own goals" ON public.member_goals
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Admins full access member_goals" ON public.member_goals
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Trainers can read assigned member goals" ON public.member_goals
  FOR SELECT USING (
    has_role(auth.uid(), 'trainer'::app_role) AND EXISTS (
      SELECT 1 FROM member_profiles WHERE member_profiles.user_id = member_goals.user_id AND member_profiles.assigned_trainer_id = auth.uid()
    )
  );

CREATE TRIGGER update_member_goals_updated_at
  BEFORE UPDATE ON public.member_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
