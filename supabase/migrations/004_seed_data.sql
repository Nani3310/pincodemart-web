-- Insert super admin email
INSERT INTO super_admin_emails (email) 
VALUES ('admin@localbazaar.com');

-- Insert categories
INSERT INTO categories (slug, name, icon, sort_order, is_active) VALUES
('fashion', 'Fashion', '👕', 1, true),
('medical', 'Medical', '💊', 2, true),
('jewelry', 'Jewellery', '💎', 3, true),
('food', 'Restaurants', '🍔', 4, true),
('local_shops', 'Local Shops', '🏪', 5, true);

-- Insert shop themes
INSERT INTO shop_themes (code, name, primary_color, secondary_color, accent_color, background_color, is_premium) VALUES
('default', 'Default Blue', '#1976D2', '#42A5F5', '#64B5F6', '#E3F2FD', false),
('green', 'Nature Green', '#2E7D32', '#4CAF50', '#66BB6A', '#E8F5E9', false),
('orange', 'Warm Orange', '#F57C00', '#FF9800', '#FFA726', '#FFF3E0', false),
('purple', 'Premium Purple', '#7B1FA2', '#9C27B0', '#AB47BC', '#F3E5F5', true);
