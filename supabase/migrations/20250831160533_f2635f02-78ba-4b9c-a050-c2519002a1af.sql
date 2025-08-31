-- Update the place_bet function to use the new user_balances table
CREATE OR REPLACE FUNCTION public.place_bet(p_user_id uuid, p_bet_type bet_type, p_stake_usd numeric, p_stake_btc numeric, p_potential_payout_usd numeric, p_potential_payout_btc numeric, p_selections jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $function$
DECLARE
  v_bet_id uuid;
  v_current_balance_usd numeric;
  v_current_balance_btc numeric;
  v_selection jsonb;
BEGIN
  -- Get current user balance from user_balances table
  SELECT balance_usd, balance_btc 
  INTO v_current_balance_usd, v_current_balance_btc
  FROM user_balances 
  WHERE user_id = p_user_id;
  
  -- Check if user balance record exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User balance record not found';
  END IF;
  
  -- Check if user has sufficient balance
  IF v_current_balance_usd < p_stake_usd THEN
    RAISE EXCEPTION 'Insufficient USD balance. Current: %, Required: %', v_current_balance_usd, p_stake_usd;
  END IF;
  
  IF v_current_balance_btc < p_stake_btc THEN
    RAISE EXCEPTION 'Insufficient BTC balance. Current: %, Required: %', v_current_balance_btc, p_stake_btc;
  END IF;
  
  -- Create the bet
  INSERT INTO bets (
    user_id, 
    type, 
    stake_usd, 
    stake_btc, 
    potential_payout_usd, 
    potential_payout_btc,
    status
  ) VALUES (
    p_user_id,
    p_bet_type,
    p_stake_usd,
    p_stake_btc,
    p_potential_payout_usd,
    p_potential_payout_btc,
    'pending'::bet_status
  ) RETURNING id INTO v_bet_id;
  
  -- Create bet selections
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_selections)
  LOOP
    INSERT INTO bet_selections (
      bet_id,
      game_id,
      selection,
      odds,
      league,
      market
    ) VALUES (
      v_bet_id,
      v_selection->>'game_id',
      v_selection->>'selection',
      (v_selection->>'odds')::numeric,
      v_selection->>'league',
      v_selection->>'market'
    );
  END LOOP;
  
  -- Deduct stake from user balance in user_balances table
  UPDATE user_balances 
  SET 
    balance_usd = balance_usd - p_stake_usd,
    balance_btc = balance_btc - p_stake_btc,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record the transaction for USD stake (if > 0)
  IF p_stake_usd > 0 THEN
    INSERT INTO transactions (
      user_id,
      type,
      amount_usd,
      note
    ) VALUES (
      p_user_id,
      'bet_stake'::transaction_type,
      -p_stake_usd, -- Negative amount for deduction
      'Bet stake deduction for bet ID: ' || v_bet_id
    );
  END IF;
  
  -- Record the transaction for BTC stake (if > 0)
  IF p_stake_btc > 0 THEN
    INSERT INTO transactions (
      user_id,
      type,
      amount_btc,
      note
    ) VALUES (
      p_user_id,
      'bet_stake'::transaction_type,
      -p_stake_btc, -- Negative amount for deduction
      'Bet stake deduction for bet ID: ' || v_bet_id
    );
  END IF;
  
  RETURN v_bet_id;
END;
$function$;