-- Function to make a liability payment
-- This function:
-- 1. Updates the liability entry with the new payment amount
-- 2. Creates an expenditure entry for the payment using the standard "Liability Payment" category
-- 3. Updates the account balance if an account is specified
-- 4. Returns the updated liability entry

CREATE OR REPLACE FUNCTION make_liability_payment(
  p_liability_id UUID,
  p_payment_amount DECIMAL,
  p_payment_date DATE,
  p_payment_method TEXT DEFAULT 'cash',
  p_account_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_liability RECORD;
  v_new_amount_paid DECIMAL;
  v_new_amount_remaining DECIMAL;
  v_new_status TEXT;
  v_category_id UUID;
  v_expenditure_id UUID;
  v_result JSONB;
BEGIN
  -- Get the liability entry
  SELECT * INTO v_liability
  FROM liability_entries
  WHERE id = p_liability_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Liability entry with ID % not found', p_liability_id;
  END IF;
  
  -- Calculate new amounts
  v_new_amount_paid := COALESCE(v_liability.amount_paid::DECIMAL, 0) + p_payment_amount;
  v_new_amount_remaining := GREATEST(0, v_liability.total_amount::DECIMAL - v_new_amount_paid);
  
  -- Determine new status
  IF v_new_amount_paid >= v_liability.total_amount::DECIMAL THEN
    v_new_status := 'paid';
  ELSE
    v_new_status := 'partial';
  END IF;
  
  -- Update the liability entry
  UPDATE liability_entries
  SET 
    amount_paid = v_new_amount_paid::TEXT,
    amount_remaining = v_new_amount_remaining::TEXT,
    status = v_new_status,
    last_payment_date = p_payment_date,
    updated_at = NOW()
  WHERE id = p_liability_id;
  
  -- Get or create the standard "Liability Payment" category
  SELECT id INTO v_category_id
  FROM expenditure_categories
  WHERE name = 'Liability Payment';
  
  -- If the category doesn't exist, create it
  IF v_category_id IS NULL THEN
    INSERT INTO expenditure_categories (
      name,
      description,
      created_at,
      updated_at
    ) VALUES (
      'Liability Payment',
      'System category for liability payments',
      NOW(),
      NOW()
    ) RETURNING id INTO v_category_id;
  END IF;
  
  -- Create an expenditure entry for the payment
  INSERT INTO expenditure_entries (
    date,
    amount,
    description,
    category_id,
    payment_method,
    account_id,
    recipient,
    liability_payment,
    liability_id,
    created_at,
    updated_at
  ) VALUES (
    p_payment_date,
    p_payment_amount,
    COALESCE(p_description, 'Payment for ' || v_liability.creditor_name),
    v_category_id,
    p_payment_method,
    p_account_id,
    v_liability.creditor_name,
    TRUE,
    p_liability_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_expenditure_id;
  
  -- Update account balance if an account is specified
  IF p_account_id IS NOT NULL THEN
    -- This assumes you have a function to update account balances
    -- If you don't, you can implement the logic directly here
    BEGIN
      PERFORM update_account_balance(p_account_id, p_payment_amount, 'expenditure');
    EXCEPTION WHEN OTHERS THEN
      -- Log the error but continue with the transaction
      RAISE WARNING 'Failed to update account balance: %', SQLERRM;
    END;
  END IF;
  
  -- Get the updated liability entry
  SELECT row_to_json(l)::JSONB INTO v_result
  FROM (
    SELECT * FROM liability_entries WHERE id = p_liability_id
  ) l;
  
  -- Add expenditure information to the result
  v_result := v_result || jsonb_build_object(
    'expenditure_id', v_expenditure_id,
    'payment_amount', p_payment_amount,
    'payment_date', p_payment_date,
    'payment_method', p_payment_method,
    'account_id', p_account_id
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Comment on the function
COMMENT ON FUNCTION make_liability_payment IS 'Makes a payment for a liability, updates the liability entry, creates an expenditure entry, and optionally updates the account balance';
