/**
 * Smart City 360 - Statistics & Analytics Routes
 */

const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const PriorityService = require('../services/priorityService');

// GET /api/stats/overview (Live dynamic counts for home page and dashboard)
router.get('/overview', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stats/priority-rankings (Intelligent Highlights and Zone Rankings)
router.get('/priority-rankings', async (req, res) => {
  try {
    const highlights = await PriorityService.getIntelligenceHighlights();
    res.json({
      success: true,
      data: highlights
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stats/geo-heatmap (Heatmap coordinates with intensity)
router.get('/geo-heatmap', async (req, res) => {
  try {
    const complaints = await db.getComplaints();
    // Return array of [lat, lng, intensity]
    const heatmapPoints = complaints
      .filter(c => !['Resolved', 'Closed'].includes(c.status))
      .map(c => {
        // Normalize intensity 0.2 to 1.0 based on priority score
        const intensity = Math.min(1.0, Math.max(0.2, (c.priority_score || 50) / 100));
        return [c.latitude, c.longitude, intensity];
      });

    res.json({
      success: true,
      count: heatmapPoints.length,
      points: heatmapPoints
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stats/areas
router.get('/areas', async (req, res) => {
  try {
    const areas = await db.getGeographicAreas();
    res.json({
      success: true,
      data: areas
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
