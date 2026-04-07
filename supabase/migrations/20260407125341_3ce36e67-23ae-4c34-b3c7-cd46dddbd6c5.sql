-- Allow all authenticated users to read user_roles (needed for messaging contact discovery)
CREATE POLICY "Authenticated users can read all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to read all profiles (needed for messaging, displaying names)
CREATE POLICY "Authenticated users can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);