-- Manual ad payment keeps the ad in the superadmin queue without Razorpay.
CREATE OR REPLACE FUNCTION request_ad_payment(p_ad_id UUID)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID := auth.uid();
  ad_record advertisements;
  ad_amount DOUBLE PRECISION;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT ad.* INTO ad_record
  FROM advertisements ad
  JOIN shops s ON s.id = ad.shop_id
  WHERE ad.id = p_ad_id AND s.owner_id = current_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'advertisement not found';
  END IF;

  ad_amount := CASE ad_record.tier
    WHEN 'tier_1' THEN 500
    WHEN 'tier_2' THEN 300
    WHEN 'tier_3' THEN 150
    ELSE 150
  END;

  UPDATE advertisements
  SET payment_status = 'completed'
  WHERE id = p_ad_id;

  IF NOT EXISTS (
    SELECT 1 FROM payment_transactions
    WHERE user_id = current_user_id
      AND purpose = 'ad_' || COALESCE(ad_record.tier, 'tier_3')
      AND metadata ->> 'ad_id' = p_ad_id::TEXT
      AND status = 'completed'
  ) THEN
    INSERT INTO payment_transactions (
      user_id, phone_digits, purpose, amount_inr, amount_paise,
      razorpay_order_id, status, metadata
    ) VALUES (
      current_user_id, '', 'ad_' || COALESCE(ad_record.tier, 'tier_3'),
      ad_amount, (ad_amount * 100)::INTEGER, 'manual-' || gen_random_uuid()::TEXT,
      'completed', jsonb_build_object('ad_id', p_ad_id, 'approval_required', true)
    );
  END IF;

  RETURN json_build_object('submitted', true, 'ad_id', p_ad_id, 'amount_inr', ad_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION request_ad_payment(UUID) TO authenticated;
