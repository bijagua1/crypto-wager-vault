-- Update the settle_bet function to use the new user_balances table
CREATE OR REPLACE FUNCTION public.settle_bet(p_bet_id uuid, p_status bet_status, p_payout_usd numeric DEFAULT 0, p_payout_btc numeric DEFAULT 0)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_current_status bet_status;
BEGIN
  -- Get bet details
  SELECT user_id, status 
  INTO v_user_id, v_current_status
  FROM bets 
  WHERE id = p_bet_id;
  
  -- Check if bet exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found';
  END IF;
  
  -- Only allow settling pending bets
  IF v_current_status != 'pending'::bet_status THEN
    RAISE EXCEPTION 'Bet is already settled with status: %', v_current_status;
  END IF;
  
  -- Update bet status
  UPDATE bets 
  SET 
    status = p_status,
    updated_at = now()
  WHERE id = p_bet_id;
  
  -- If bet is won, add payout to user balance in user_balances table
  IF p_status = 'won'::bet_status THEN
    -- Add winnings to user balance
    UPDATE user_balances 
    SET 
      balance_usd = balance_usd + p_payout_usd,
      balance_btc = balance_btc + p_payout_btc,
      updated_at = now()
    WHERE user_id = v_user_id;
    
    -- Record payout transactions
    IF p_payout_usd > 0 THEN
      INSERT INTO transactions (
        user_id,
        type,
        amount_usd,
        note
      ) VALUES (
        v_user_id,
        'bet_payout'::transaction_type,
        p_payout_usd,
        'Bet winnings for bet ID: ' || p_bet_id
      );
    END IF;
    
    IF p_payout_btc > 0 THEN
      INSERT INTO transactions (
        user_id,
        type,
        amount_btc,
        note
      ) VALUES (
        v_user_id,
        'bet_payout'::transaction_type,
        p_payout_btc,
        'Bet winnings for bet ID: ' || p_bet_id
      );
    END IF;
  END IF;
END;
$function$;