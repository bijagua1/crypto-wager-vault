-- Add missing enum values for transaction_type used by place_bet/settle_bet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'bet_stake'
  ) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'bet_stake';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'transaction_type' AND e.enumlabel = 'bet_payout'
  ) THEN
    ALTER TYPE public.transaction_type ADD VALUE 'bet_payout';
  END IF;
END $$;