/**
 * Smart City 360 - Administrator Settings & Configuration Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const PriorityService = require('../services/priorityService');

router.use(verifyToken);
router.use(requireRole(['admin']));

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/settings
router.post('/', async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    // Recalculate priorities based on new weights
    await PriorityService.recalculateAllPriorities();
    res.json({
      success: true,
      message: 'Priority weights & thresholds updated successfully and scores recalculated.',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/settings/logs (Government Integration Logs)
router.get('/logs', async (req, res) => {
  try {
    const logs = await db.getIntegrationLogs();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
