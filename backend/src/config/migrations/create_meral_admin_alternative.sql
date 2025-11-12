-- Alternative: Create admin with pre-hashed password
-- First run this Node.js command to generate the hash:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Cemal1234.', 10).then(h => console.log(h));"
-- Then use the generated hash below

-- Insert admin user with pre-hashed password
-- Password: Cemal1234.
-- You need to generate the hash first using Node.js:
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Cemal1234.', 10).then(h => console.log(h));"

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
    '$2a$10$REPLACE_WITH_GENERATED_HASH', -- Replace this with the hash from Node.js command
    'superadmin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
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


