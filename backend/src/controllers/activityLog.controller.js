import activityLogService from '../services/activityLog.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

class ActivityLogController {
  // GET /api/admin/logs - Log listesi
  getLogs = asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 50,
      userId,
      adminId,
      action,
      entityType,
      level,
      startDate,
      endDate,
      searchEmail,
      searchIp,
      userType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await activityLogService.getLogs({
      page: parseInt(page),
      limit: parseInt(limit),
      userId,
      adminId,
      action,
      entityType,
      level,
      startDate,
      endDate,
      searchEmail,
      searchIp,
      userType,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  });

  // GET /api/admin/logs/:id - Log detayı
  getLogById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const log = await activityLogService.getLogById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Aktivitätsprotokoll nicht gefunden',
      });
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  });

  // GET /api/admin/logs/stats - İstatistikler
  getLogStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const stats = await activityLogService.getLogStats({
      startDate,
      endDate,
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  });
}

export default new ActivityLogController();

