-- Add admin role for the user
INSERT INTO user_roles (user_id, role) 
VALUES ('1f394ce2-dead-4197-9047-b9394d9fce75', 'admin') 
ON CONFLICT (user_id, role) DO NOTHING;