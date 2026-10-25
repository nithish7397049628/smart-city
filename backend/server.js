/**
 * Smart City 360 - Main Server
 * Smart Civic Issue Reporting and Resolution System
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initDb } = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const officialRoutes = require('./routes/officialRoutes');
const statsRoutes = require('./routes/statsRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable Production Security Headers with Helmet
// Configured to permit Leaflet tiles, Google Fonts, and CDNs
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://unpkg.com"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://*.tile.openstreetmap.org",
          "https://unpkg.com",
          "https://images.unsplash.com"
        ],
        connectSrc: ["'self'", "https://api.smartcity360.gov.in"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// Enable Gzip Compression for Fast Asset Delivery
app.use(compression());

// Enable CORS
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*';
app.use(cors({ origin: allowedOrigins }));

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP. Please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Stricter Rate Limiting on Authentication (Brute Force Protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // 30 attempts per 15 min
  message: { success: false, message: 'Too many login attempts. Please try again later.' }
});
app.use('/api/auth/login', authLimiter);

// Serve Uploaded Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
}));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/official', officialRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/settings', settingsRoutes);

// System Health Check (for Cloud Load Balancers & Health Probes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Smart City 360',
    tagline: 'Your Voice. Our City. A Better Tomorrow.',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Root & Static Fallback Route
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Start Server Function
async function startServer() {
  try {
    await initDb();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('================================================================');
      console.log(`🚀 Smart City 360 Web Application is LIVE on port ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`📍 Interactive Live Map: http://localhost:${PORT}/map.html`);
      console.log(`📋 Report Issue: http://localhost:${PORT}/report.html`);
      console.log(`🔍 Track Complaint: http://localhost:${PORT}/track.html`);
      console.log(`🏛️ Officials Dashboard: http://localhost:${PORT}/dashboard.html`);
      console.log('================================================================');
    });
    return server;
  } catch (err) {
    console.error('Fatal startup error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
