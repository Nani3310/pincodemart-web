-- Marketplace access is an admin-approved request. Razorpay is optional and
-- must not block a merchant from submitting the request.
CREATE OR REPLACE FUNCTION request_marketplace_access(p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID := auth.uid();
  current_phone TEXT;
  existing_transaction payment_transactions;
  new_transaction payment_transactions;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM shops
    WHERE id = p_shop_id AND owner_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'shop not found';
  END IF;

  SELECT phone INTO current_phone FROM profiles WHERE id = current_user_id;

  SELECT * INTO existing_transaction
  FROM payment_transactions
  WHERE user_id = current_user_id
    AND purpose = 'marketplace_access'
    AND metadata ->> 'shop_id' = p_shop_id::TEXT
    AND status IN ('pending_admin', 'completed')
  ORDER BY created_at DESC
  LIMIT 1;

  IF existing_transaction.id IS NOT NULL THEN
    RETURN json_build_object(
      'submitted', true,
      'already_submitted', true,
      'status', existing_transaction.status,
      'transaction_id', existing_transaction.id,
      'shop_id', p_shop_id
    );
  END IF;

  INSERT INTO payment_transactions (
    user_id, phone_digits, purpose, amount_inr, amount_paise,
    razorpay_order_id, status, metadata
  ) VALUES (
    current_user_id,
    RIGHT(regexp_replace(COALESCE(current_phone, ''), '[^0-9]', '', 'g'), 10),
    'marketplace_access', 300, 30000,
    'manual-' || gen_random_uuid()::TEXT,
    'pending_admin', jsonb_build_object('shop_id', p_shop_id, 'approval_required', true)
  )
  RETURNING * INTO new_transaction;

  RETURN json_build_object(
    'submitted', true,
    'already_submitted', false,
    'status', new_transaction.status,
    'transaction_id', new_transaction.id,
    'shop_id', p_shop_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION request_marketplace_access(UUID) TO authenticated;

-- Approving the merchant also completes the manual ₹300 access request and
-- makes the store visible for the next 30 days.
CREATE OR REPLACE FUNCTION admin_update_shop_status(
  p_shop_id UUID,
  p_status TEXT
)
RETURNS JSON AS $$
DECLARE
  updated_shop shops;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid shop status';
  END IF;

  UPDATE shops
  SET status = p_status::shop_status,
      is_paywall_cleared = CASE
        WHEN p_status = 'approved' THEN true
        ELSE is_paywall_cleared
      END,
      paywall_valid_until = CASE
        WHEN p_status = 'approved' THEN NOW() + INTERVAL '30 days'
        ELSE paywall_valid_until
      END,
      updated_at = NOW()
  WHERE id = p_shop_id
  RETURNING * INTO updated_shop;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'shop not found';
  END IF;

  IF p_status = 'approved' THEN
    UPDATE payment_transactions
    SET status = 'completed', razorpay_payment_id = COALESCE(razorpay_payment_id, 'admin-approved')
    WHERE purpose = 'marketplace_access'
      AND status = 'pending_admin'
      AND metadata ->> 'shop_id' = p_shop_id::TEXT;
  END IF;

  RETURN json_build_object(
    'id', updated_shop.id,
    'owner_id', updated_shop.owner_id,
    'status', updated_shop.status,
    'is_paywall_cleared', updated_shop.is_paywall_cleared,
    'paywall_valid_until', updated_shop.paywall_valid_until,
    'updated_at', updated_shop.updated_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_update_shop_status(UUID, TEXT) TO authenticated;
