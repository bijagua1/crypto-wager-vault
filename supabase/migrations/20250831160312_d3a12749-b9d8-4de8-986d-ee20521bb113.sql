-- Create separate user_balances table for financial data
-- This separates sensitive financial information from basic profile data

-- Create user_balances table
CREATE TABLE public.user_balances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance_usd numeric NOT NULL DEFAULT 0,
  balance_btc numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on user_balances table
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Create strict RLS policies for user_balances (no admin bypass for viewing)
CREATE POLICY "Users can view own balance only" 
ON public.user_balances 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users cannot insert balances" 
ON public.user_balances 
FOR INSERT 
WITH CHECK (false); -- Only system can create balance records

CREATE POLICY "Users cannot delete balances" 
ON public.user_balances 
FOR DELETE 
USING (false); -- Only system can delete balance records

-- Only admin can update balances (for admin panel functionality)
CREATE POLICY "Admins can update any balance" 
ON public.user_balances 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Migrate existing balance data from profiles to user_balances
INSERT INTO public.user_balances (user_id, balance_usd, balance_btc, created_at, updated_at)
SELECT id, balance_usd, balance_btc, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- Remove financial columns from profiles table (after data migration)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS balance_usd;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS balance_btc;

-- Add trigger for automatic timestamp updates on user_balances
CREATE TRIGGER update_user_balances_updated_at
BEFORE UPDATE ON public.user_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the handle_new_user function to create balance record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
begin
  -- Insert into profiles
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  
  -- Insert initial balance record
  insert into public.user_balances (user_id, balance_usd, balance_btc)
  values (new.id, 0, 0)
  on conflict (user_id) do nothing;
  
  return new;
end;
$function$;