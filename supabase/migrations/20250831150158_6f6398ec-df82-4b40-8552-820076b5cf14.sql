-- Create function to handle bet placement with balance deduction
CREATE OR REPLACE FUNCTION public.place_bet(
  p_user_id uuid,
  p_bet_type bet_type,
  p_stake_usd numeric,
  p_stake_btc numeric,
  p_potential_payout_usd numeric,
  p_potential_payout_btc numeric,
  p_selections jsonb -- Array of bet selections
) 
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bet_id uuid;
  v_current_balance_usd numeric;
  v_current_balance_btc numeric;
  v_selection jsonb;
BEGIN
  -- Get current user balance
  SELECT balance_usd, balance_btc 
  INTO v_current_balance_usd, v_current_balance_btc
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
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
  
  -- Deduct stake from user balance
  UPDATE profiles 
  SET 
    balance_usd = balance_usd - p_stake_usd,
    balance_btc = balance_btc - p_stake_btc,
    updated_at = now()
  WHERE id = p_user_id;
  
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
$$;

-- Create function to handle bet settlement (win/loss)
CREATE OR REPLACE FUNCTION public.settle_bet(
  p_bet_id uuid,
  p_status bet_status,
  p_payout_usd numeric DEFAULT 0,
  p_payout_btc numeric DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  
  -- If bet is won, add payout to user balance
  IF p_status = 'won'::bet_status THEN
    -- Add winnings to user balance
    UPDATE profiles 
    SET 
      balance_usd = balance_usd + p_payout_usd,
      balance_btc = balance_btc + p_payout_btc,
      updated_at = now()
    WHERE id = v_user_id;
    
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
$$;