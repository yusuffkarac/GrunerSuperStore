-- Create admin user for meral database
-- Email: webizim@gmail.com
-- Password: Cemal1234.

-- Ensure pgcrypto extension exists for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert admin user
-- Password will be hashed using crypt function (bcrypt compatible)
INSERT INTO admins (
    id,
    first_name,
    email,
    password_hash,
    role,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Admin',
    'webizim@gmail.com',
    crypt('Cemal1234.', gen_salt('bf', 10)), -- bcrypt with 10 rounds
    'superadmin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = crypt('Cemal1234.', gen_salt('bf', 10)),
    updated_at = CURRENT_TIMESTAMP;

-- Verify the admin was created
SELECT 
    id,
    first_name,
    email,
    role,
    created_at
FROM admins 
WHERE email = 'webizim@gmail.com';

