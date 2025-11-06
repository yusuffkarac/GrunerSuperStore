import userService from '../services/user.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class UserController {
  // GET /api/user/profile
  getProfile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  // PUT /api/user/profile
  updateProfile = asyncHandler(async (req, res) => {
    const { firstName, lastName, phone } = req.body;

    const user = await userService.updateProfile(req.user.id, {
      firstName,
      lastName,
      phone,
    });

    res.status(200).json({
      success: true,
      message: 'Profil erfolgreich aktualisiert',
      data: { user },
    });
  });

  // PUT /api/user/password
  changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await userService.changePassword(req.user.id, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: 'Passwort erfolgreich geändert',
    });
  });

  // GET /api/user/addresses
  getAddresses = asyncHandler(async (req, res) => {
    const addresses = await userService.getAddresses(req.user.id);

    res.status(200).json({
      success: true,
      data: { addresses },
    });
  });

  // POST /api/user/addresses
  createAddress = asyncHandler(async (req, res) => {
    const addressData = req.body;

    const address = await userService.createAddress(req.user.id, addressData);

    res.status(201).json({
      success: true,
      message: 'Adresse erfolgreich hinzugefügt',
      data: { address },
    });
  });

  // PUT /api/user/addresses/:id
  updateAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const addressData = req.body;

    const address = await userService.updateAddress(
      req.user.id,
      id,
      addressData
    );

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich aktualisiert',
      data: { address },
    });
  });

  // DELETE /api/user/addresses/:id
  deleteAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    await userService.deleteAddress(req.user.id, id);

    res.status(200).json({
      success: true,
      message: 'Adresse erfolgreich gelöscht',
    });
  });

  // PUT /api/user/addresses/:id/default
  setDefaultAddress = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const address = await userService.setDefaultAddress(req.user.id, id);

    res.status(200).json({
      success: true,
      message: 'Standard-Adresse festgelegt',
      data: { address },
    });
  });
}

export default new UserController();
