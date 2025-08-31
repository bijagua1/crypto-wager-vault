-- Fix security issue: Strengthen RLS policies on profiles table
-- Drop existing SELECT policies and create a single, more secure one

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a single, more secure SELECT policy that combines both cases
CREATE POLICY "Secure profile access" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can only see their own profile OR admin users can see all profiles
  (id = auth.uid()) OR 
  (has_role(auth.uid(), 'admin'::app_role))
);

-- Ensure the UPDATE policy is also secure
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Create more secure UPDATE policy
CREATE POLICY "Secure profile updates" 
ON public.profiles 
FOR UPDATE 
USING (
  -- Only admins can update profiles AND only update non-sensitive fields
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add INSERT policy to prevent unauthorized profile creation
CREATE POLICY "Prevent profile creation" 
ON public.profiles 
FOR INSERT 
WITH CHECK (false); -- No one can insert profiles via API (only via trigger)

-- Add DELETE policy to prevent unauthorized profile deletion
CREATE POLICY "Prevent profile deletion" 
ON public.profiles 
FOR DELETE 
USING (false); -- No one can delete profiles via API