/**
 * Smart City 360 - Government Officials & Admin Management Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const GovernmentIntegrationService = require('../services/governmentIntegrationService');

// Multer for Resolution Evidence Upload
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'resolution_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Protect all official routes
router.use(verifyToken);
router.use(requireRole(['official', 'admin']));

// PATCH /api/official/complaints/:id/status
router.patch('/complaints/:id/status', upload.array('resolution_evidence', 3), async (req, res) => {
  try {
    const { status, remarks, department_id } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'New status is required.' });
    }

    const resolutionImages = (req.files || []).map(file => `/uploads/${file.filename}`);

    const updated = await db.updateComplaintStatus(
      req.params.id,
      status,
      remarks,
      req.user,
      department_id,
      resolutionImages
    );

    return res.json({
      success: true,
      message: `Complaint ${updated.tracking_id} updated to ${status}.`,
      complaint: updated
    });
  } catch (err) {
    console.error('Status update error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/official/complaints/:id/forward
router.post('/complaints/:id/forward', async (req, res) => {
  try {
    const { department_id } = req.body;
    const result = await GovernmentIntegrationService.forwardComplaint(req.params.id, department_id, true);
    return res.json({
      success: true,
      message: 'Complaint forwarded to Government Department API successfully.',
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/official/export-csv
router.get('/export-csv', async (req, res) => {
  try {
    const { category_id, priority_level, status, department_id } = req.query;
    const complaints = await db.getComplaints({ category_id, priority_level, status, department_id });

    // Format CSV
    const headers = [
      'Tracking ID',
      'Citizen Name',
      'Citizen Phone',
      'Citizen Email',
      'Title',
      'Category',
      'Area',
      'Landmark Address',
      'Latitude',
      'Longitude',
      'Priority Level',
      'Priority Score',
      'Status',
      'Upvotes',
      'Created At',
      'Resolved At'
    ];

    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = complaints.map(c => [
      escapeCsv(c.tracking_id),
      escapeCsv(c.citizen_name),
      escapeCsv(c.citizen_phone),
      escapeCsv(c.citizen_email || 'N/A'),
      escapeCsv(c.title),
      escapeCsv(c.category_name),
      escapeCsv(c.area_name),
      escapeCsv(c.address_landmark),
      c.latitude,
      c.longitude,
      escapeCsv(c.priority_level),
      c.priority_score,
      escapeCsv(c.status),
      c.upvote_count,
      escapeCsv(c.created_at),
      escapeCsv(c.resolved_at || 'Unresolved')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="smartcity360_complaints_${Date.now()}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
