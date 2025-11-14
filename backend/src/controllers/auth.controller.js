import authService from '../services/auth.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import activityLogService from '../services/activityLog.service.js';

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

    // Log kaydı
    if (result.user) {
      await activityLogService.createLog({
        userId: result.user.id,
        action: 'user.register',
        entityType: 'user',
        entityId: result.user.id,
        level: 'success',
        message: `Benutzer hat sich registriert: ${email}`,
        metadata: { email, firstName, lastName },
        req,
      });
    }

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

    // Log kaydı
    if (result.user) {
      await activityLogService.createLog({
        userId: result.user.id,
        action: 'user.login',
        entityType: 'user',
        entityId: result.user.id,
        level: 'success',
        message: `Benutzer hat sich angemeldet: ${email}`,
        metadata: { email },
        req,
      });
    }

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

    // Log kaydı - kullanıcı bulunursa
    if (result.userId) {
      try {
        await activityLogService.createLog({
          userId: result.userId,
          action: 'user.forgot_password',
          entityType: 'user',
          entityId: result.userId,
          level: 'info',
          message: `Passwort-Reset wurde angefordert: ${email}`,
          metadata: { email },
          req,
        });
      } catch (logError) {
        console.error('Log kaydı hatası (user.forgot_password):', logError);
      }
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  });

  // POST /api/auth/reset-password
  resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    // Log kaydı - kullanıcı bulunursa
    if (result.userId) {
      try {
        await activityLogService.createLog({
          userId: result.userId,
          action: 'user.reset_password',
          entityType: 'user',
          entityId: result.userId,
          level: 'success',
          message: `Passwort wurde zurückgesetzt`,
          metadata: {},
          req,
        });
      } catch (logError) {
        console.error('Log kaydı hatası (user.reset_password):', logError);
      }
    }

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

    // Log kaydı
    if (result.user) {
      await activityLogService.createLog({
        userId: result.user.id,
        action: 'user.verify_email',
        entityType: 'user',
        entityId: result.user.id,
        level: 'success',
        message: `E-Mail-Adresse wurde bestätigt: ${email}`,
        metadata: { email },
        req,
      });
    }

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
