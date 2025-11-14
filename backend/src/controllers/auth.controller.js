import authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class AuthController {
  // POST /api/auth/register
  register = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, phone } = req.body;

    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      phone,
    });

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        user: result.user,
      },
    });
  });

  // POST /api/auth/login
  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login({ email, password });

    res.status(200).json({
      success: true,
      message: 'Anmeldung erfolgreich',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  });

  // GET /api/auth/me
  getMe = asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  // POST /api/auth/forgot-password
  forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/auth/reset-password
  resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/auth/verify-email
  verifyEmail = asyncHandler(async (req, res) => {
    const { email, code } = req.body;

    console.log('📥 [Controller] verifyEmail isteği alındı:', { 
      email, 
      code,
      emailType: typeof email,
      emailLength: email?.length,
      hasDot: email?.includes('.')
    });

    const result = await authService.verifyEmail({ email, code });

    res.status(200).json({
      success: true,
      message: 'E-Mail erfolgreich bestätigt',
      data: {
        user: result.user,
        token: result.token,
      },
    });
  });

  // POST /api/auth/resend-verification
  resendVerification = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.resendVerificationCode(email);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });
}

export default new AuthController();
