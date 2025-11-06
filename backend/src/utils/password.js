import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Şifre hash'le
export const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Şifre doğrula
export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Şifre gücü kontrolü
export const validatePasswordStrength = (password) => {
  // Min 8 karakter, en az 1 büyük harf, 1 küçük harf, 1 rakam
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return {
    isValid: minLength && hasUpperCase && hasLowerCase && hasNumber,
    minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumber,
  };
};
