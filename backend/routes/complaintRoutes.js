/**
 * Smart City 360 - Complaint Routes
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../config/db');
const { optionalAuth, verifyToken } = require('../middleware/authMiddleware');
const GovernmentIntegrationService = require('../services/governmentIntegrationService');

// Multer Storage Configuration
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = 'complaint_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + ext;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP image files are allowed.'));
    }
  }
});

// Helper to mask sensitive citizen info for public views (Section 9: Privacy requirement)
function maskComplaintPrivacy(complaint, isAuthorized = false) {
  if (isAuthorized) return complaint;
  const copy = { ...complaint };
  if (copy.citizen_phone) {
    const p = String(copy.citizen_phone);
    copy.citizen_phone = p.length > 5 ? p.substring(0, 3) + '*****' + p.slice(-2) : '******';
  }
  if (copy.citizen_email) {
    const parts = copy.citizen_email.split('@');
    if (parts.length === 2) {
      copy.citizen_email = parts[0].substring(0, 2) + '***@' + parts[1];
    }
  }
  return copy;
}

// GET /api/complaints/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/departments
router.get('/departments', async (req, res) => {
  try {
    const departments = await db.getDepartments();
    res.json({ success: true, data: departments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/check-duplicate
router.get('/check-duplicate', async (req, res) => {
  try {
    const { latitude, longitude, category_id, radius = 0.3 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required.' });
    }
    const matches = await db.findDuplicateNearby(latitude, longitude, category_id, Number(radius));
    res.json({
      success: true,
      hasPotentialDuplicate: matches.length > 0,
      count: matches.length,
      matches: matches.map(c => maskComplaintPrivacy(c, false))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category_id, priority_level, status, department_id, search } = req.query;
    const complaints = await db.getComplaints({
      category_id,
      priority_level,
      status,
      department_id,
      search
    });

    const isAuthorized = req.user && ['official', 'admin'].includes(req.user.role);
    const masked = complaints.map(c => maskComplaintPrivacy(c, isAuthorized));

    res.json({
      success: true,
      count: masked.length,
      data: masked
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/complaints/:id (By ID or Tracking ID)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const complaint = await db.getComplaintById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found with provided ID or Tracking ID.' });
    }

    const isAuthorized = req.user && (
      ['official', 'admin'].includes(req.user.role) ||
      (req.user.id && complaint.citizen_id === req.user.id)
    );

    res.json({
      success: true,
      data: maskComplaintPrivacy(complaint, isAuthorized)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints (Create complaint with image upload)
router.post('/', optionalAuth, upload.array('images', 3), async (req, res) => {
  try {
    const {
      citizen_name,
      citizen_phone,
      citizen_email,
      title,
      category_id,
      description,
      state,
      district,
      city,
      area_name,
      address_landmark,
      latitude,
      longitude,
      urgency_level
    } = req.body;

    // Validation
    if (!citizen_name || !citizen_phone || !title || !category_id || !description || !area_name || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields including location on map.'
      });
    }

    // Process uploaded images
    const imagePaths = (req.files || []).map(file => `/uploads/${file.filename}`);

    const newComplaint = await db.createComplaint({
      citizen_id: req.user ? req.user.id : null,
      citizen_name,
      citizen_phone,
      citizen_email: citizen_email || null,
      title,
      category_id,
      description,
      state: state || 'Tamil Nadu',
      district: district || 'Chennai',
      city: city || 'Chennai',
      area_name,
      address_landmark: address_landmark || area_name,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      urgency_level: urgency_level || 'Medium',
      images: imagePaths
    });

    // Auto-forward to Government Department if High or Critical priority
    let govResult = null;
    try {
      govResult = await GovernmentIntegrationService.forwardComplaint(newComplaint.id);
    } catch (govErr) {
      console.warn('Auto government forwarding notice:', govErr.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Civic complaint registered successfully.',
      tracking_id: newComplaint.tracking_id,
      complaint: newComplaint,
      government_forwarding: govResult
    });
  } catch (err) {
    console.error('Complaint submission error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error processing complaint.' });
  }
});

// POST /api/complaints/:id/support (Community upvote / confirmation)
router.post('/:id/support', async (req, res) => {
  try {
    const { citizen_phone = 'Citizen-' + Math.random().toString(36).substr(2, 6) } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const result = await db.supportComplaint(req.params.id, citizen_phone, ip);
    return res.json({
      success: true,
      ...result
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/complaints/:id/reopen (Citizen reports issue still persists)
router.post('/:id/reopen', async (req, res) => {
  try {
    const { remarks = 'Citizen reported issue is still not resolved.' } = req.body;
    const updated = await db.updateComplaintStatus(
      req.params.id,
      'Reopened',
      remarks,
      { name: 'Citizen Re-verification' }
    );
    return res.json({
      success: true,
      message: 'Complaint has been reopened for urgent departmental review.',
      complaint: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
