CREATE OR REPLACE FUNCTION admin_advertisements()
RETURNS JSON AS $$
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(ad) ORDER BY ad.created_at DESC), '[]'::json)
    FROM advertisements ad
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION admin_advertisements() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_ad_tier(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION admin_set_ad_tier(
  p_ad_id UUID,
  p_tier TEXT
)
RETURNS JSON AS $$
DECLARE
  tier_count INTEGER;
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  IF p_tier IS NOT NULL AND p_tier NOT IN ('tier_1', 'tier_2', 'tier_3') THEN
    RAISE EXCEPTION 'invalid ad tier';
  END IF;

  IF p_tier IS NOT NULL THEN
    SELECT COUNT(*) INTO tier_count
    FROM advertisements
    WHERE tier = p_tier
      AND approval_status = 'approved'
      AND is_active = true
      AND id <> p_ad_id;

    IF tier_count >= 10 THEN
      RAISE EXCEPTION 'This tier already has the maximum of 10 active advertisements';
    END IF;
  END IF;

  UPDATE advertisements
  SET tier = p_tier,
      sort_order = CASE
        WHEN p_tier IS NULL THEN 0
        ELSE COALESCE((
          SELECT MAX(existing.sort_order) + 1
          FROM advertisements existing
          WHERE existing.tier = p_tier
            AND existing.id <> p_ad_id
        ), 0)
      END
  WHERE id = p_ad_id
    AND approval_status = 'approved'
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only approved active advertisements can be assigned to a tier';
  END IF;

  RETURN json_build_object('id', p_ad_id, 'tier', p_tier);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
