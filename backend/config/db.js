/**
 * Smart City 360 - Database Abstraction Layer
 * Supports MySQL (mysql2/promise) and transparent local storage persistence fallback.
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const DATA_FILE = path.join(__dirname, '..', 'database', 'data.json');
let pool = null;
let useLocalMode = false;
let memoryDb = null;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initial seed data if local data file doesn't exist
const initialSeedData = {
  departments: [
    { id: 1, code: 'MUNICIPAL', name: 'Municipal Corporation', contact_email: 'municipal@smartcity360.gov.in', contact_phone: '+91 44 2538 1001', head_name: 'K. Rajasekaran, IAS', description: 'General civic amenities, city governance, and civic licences' },
    { id: 2, code: 'ROADS', name: 'Roads & Highways Department', contact_email: 'highways@smartcity360.gov.in', contact_phone: '+91 44 2538 1002', head_name: 'Er. M. Senthil Kumar', description: 'Road resurfacing, pothole repairs, street infrastructure, and bridge upkeep' },
    { id: 3, code: 'WATER', name: 'Water Supply & Sewerage Board', contact_email: 'water@smartcity360.gov.in', contact_phone: '+91 44 2538 1003', head_name: 'Dr. P. Sundaram', description: 'Drinking water pipelines, leakage control, tanker distribution, and water reservoirs' },
    { id: 4, code: 'ELECTRICITY', name: 'Electricity Board & Power Distribution', contact_email: 'power@smartcity360.gov.in', contact_phone: '+91 44 2538 1004', head_name: 'Er. V. Anbarasan', description: 'Power grid, transformer faults, fallen cables, and street light infrastructure' },
    { id: 5, code: 'DRAINAGE', name: 'Drainage & Sanitation Department', contact_email: 'drainage@smartcity360.gov.in', contact_phone: '+91 44 2538 1005', head_name: 'S. Meenakshi', description: 'Underground drainage, stormwater drain clearing, sewage line blockages' },
    { id: 6, code: 'WASTE', name: 'Waste Management & Solid Waste Board', contact_email: 'waste@smartcity360.gov.in', contact_phone: '+91 44 2538 1006', head_name: 'R. Balachander', description: 'Door-to-door garbage collection, community dustbins, compost plants, recycling' },
    { id: 7, code: 'TRAFFIC', name: 'Traffic & Road Safety Department', contact_email: 'traffic@smartcity360.gov.in', contact_phone: '+91 44 2538 1007', head_name: 'DCP Anand Kumar, IPS', description: 'Traffic signal synchronization, speed breakers, pedestrian crosswalks, signages' },
    { id: 8, code: 'PARKS', name: 'Parks & Public Spaces Department', contact_email: 'parks@smartcity360.gov.in', contact_phone: '+91 44 2538 1008', head_name: 'G. Latha', description: 'Public park upkeep, garden maintenance, play equipment, and urban tree canopy' },
    { id: 9, code: 'OTHER', name: 'Other Relevant Civic Authorities', contact_email: 'support@smartcity360.gov.in', contact_phone: '+91 44 2538 1009', head_name: 'Civic Grievance Cell', description: 'Inter-departmental coordination and miscellaneous civic grievances' }
  ],
  complaint_categories: [
    { id: 1, name: 'Streetlight Problems', slug: 'streetlight-problems', icon: 'sun', base_severity: 'Medium', default_department_id: 4, description: 'Non-functioning streetlights, blinking lights, broken poles, or dark stretches' },
    { id: 2, name: 'Damaged Roads and Potholes', slug: 'damaged-roads-and-potholes', icon: 'alert-triangle', base_severity: 'High', default_department_id: 2, description: 'Deep potholes, broken tarmac, uneven road surfaces posing vehicular hazard' },
    { id: 3, name: 'Water Supply Problems', slug: 'water-supply-problems', icon: 'droplet', base_severity: 'High', default_department_id: 3, description: 'Low pressure, contaminated water, erratic water timing, or zero supply' },
    { id: 4, name: 'Water Pipeline Leakage', slug: 'water-pipeline-leakage', icon: 'shield-alert', base_severity: 'High', default_department_id: 3, description: 'Burst underground mains, surface pipe fractures wasting potable water' },
    { id: 5, name: 'Electrical Line Problems', slug: 'electrical-line-problems', icon: 'zap', base_severity: 'Critical', default_department_id: 4, description: 'Sparking overhead lines, hanging live cables, exposed junction boxes' },
    { id: 6, name: 'Drainage and Sewage Problems', slug: 'drainage-and-sewage-problems', icon: 'refresh-cw', base_severity: 'Critical', default_department_id: 5, description: 'Overflowing manholes, stagnant sewage on streets, chocked drainage channels' },
    { id: 7, name: 'Garbage Collection', slug: 'garbage-collection', icon: 'trash-2', base_severity: 'Medium', default_department_id: 6, description: 'Missed door-to-door pickup, overflowing bin clusters, scattered domestic litter' },
    { id: 8, name: 'Waste Management', slug: 'waste-management', icon: 'package', base_severity: 'High', default_department_id: 6, description: 'Illegal construction debris dumping, industrial waste, plastic accumulation' },
    { id: 9, name: 'Flooding and Waterlogging', slug: 'flooding-and-waterlogging', icon: 'cloud-drizzle', base_severity: 'Critical', default_department_id: 5, description: 'Monsoon stormwater flooding streets, submerged intersections, road blockages' },
    { id: 10, name: 'Fallen Trees', slug: 'fallen-trees', icon: 'cloud-lightning', base_severity: 'High', default_department_id: 8, description: 'Fallen trees or precarious heavy boughs blocking streets or damaging wires' },
    { id: 11, name: 'Traffic and Road Safety', slug: 'traffic-and-road-safety', icon: 'compass', base_severity: 'High', default_department_id: 7, description: 'Broken traffic lights, blind turns, missing pedestrian crossings, missing signages' },
    { id: 12, name: 'Public Toilet Maintenance', slug: 'public-toilet-maintenance', icon: 'check-square', base_severity: 'Medium', default_department_id: 1, description: 'Unhygienic community toilets, waterless latrines, broken door locks' },
    { id: 13, name: 'Public Park Maintenance', slug: 'public-park-maintenance', icon: 'feather', base_severity: 'Low', default_department_id: 8, description: 'Broken play equipment, overgrown bushes, non-working sprinklers in public parks' },
    { id: 14, name: 'Stray Animal Problems', slug: 'stray-animal-problems', icon: 'shield', base_severity: 'Medium', default_department_id: 1, description: 'Aggressive stray dog packs, cattle blocking main traffic corridors' },
    { id: 15, name: 'Other Civic Issues', slug: 'other-civic-issues', icon: 'help-circle', base_severity: 'Medium', default_department_id: 9, description: 'Noise pollution, encroachments on footpaths, open excavation without barricade' }
  ],
  users: [
    {
      id: 1,
      full_name: 'Civic System Administrator',
      email: 'admin@smartcity360.gov.in',
      phone_number: '+919876543210',
      password_hash: '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', // admin123
      role: 'admin',
      department_id: null,
      is_active: 1
    },
    {
      id: 2,
      full_name: 'Chief Municipal Engineer',
      email: 'official@smartcity360.gov.in',
      phone_number: '+919840112233',
      password_hash: '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', // official123
      role: 'official',
      department_id: 2,
      is_active: 1
    },
    {
      id: 3,
      full_name: 'Water Board Executive Officer',
      email: 'water.officer@smartcity360.gov.in',
      phone_number: '+919840223344',
      password_hash: '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba',
      role: 'official',
      department_id: 3,
      is_active: 1
    },
    {
      id: 4,
      full_name: 'Citizen Nithish Kumar',
      email: 'citizen@gmail.com',
      phone_number: '+919840998877',
      password_hash: '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', // citizen123
      role: 'citizen',
      department_id: null,
      is_active: 1
    }
  ],
  administrator_settings: {
    priority_weight_frequency: 0.30,
    priority_weight_unresolved: 0.25,
    priority_weight_severity: 0.20,
    priority_weight_recency: 0.15,
    priority_weight_reporters: 0.10,
    threshold_critical: 80,
    threshold_high: 60,
    threshold_medium: 35,
    threshold_low: 0,
    gov_api_auto_forward: true
  },
  geographic_areas: [
    {
      id: 1,
      name: 'T. Nagar Commercial Hub',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
      center_lat: 13.0418,
      center_lng: 80.2341,
      risk_level: 'Critical',
      total_reports: 34,
      unresolved_count: 22,
      priority_score: 89.2
    },
    {
      id: 2,
      name: 'Velachery Stormwater Basin',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600042',
      center_lat: 12.9815,
      center_lng: 80.2180,
      risk_level: 'High',
      total_reports: 28,
      unresolved_count: 16,
      priority_score: 76.5
    },
    {
      id: 3,
      name: 'Tambaram Transit Junction',
      district: 'Chengalpattu',
      state: 'Tamil Nadu',
      pincode: '600045',
      center_lat: 12.9249,
      center_lng: 80.1000,
      risk_level: 'Critical',
      total_reports: 29,
      unresolved_count: 21,
      priority_score: 84.0
    },
    {
      id: 4,
      name: 'Anna Nagar West Zone',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600040',
      center_lat: 13.0850,
      center_lng: 80.2101,
      risk_level: 'Medium',
      total_reports: 14,
      unresolved_count: 6,
      priority_score: 47.8
    },
    {
      id: 5,
      name: 'Mylapore Cultural Quarter',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600004',
      center_lat: 13.0368,
      center_lng: 80.2676,
      risk_level: 'High',
      total_reports: 20,
      unresolved_count: 12,
      priority_score: 65.4
    },
    {
      id: 6,
      name: 'Adyar Green Sector',
      district: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600020',
      center_lat: 13.0012,
      center_lng: 80.2565,
      risk_level: 'Low',
      total_reports: 8,
      unresolved_count: 2,
      priority_score: 22.0
    }
  ],
  complaints: [
    {
      id: 1,
      tracking_id: 'SC360-2026-1001',
      citizen_id: 4,
      citizen_name: 'Nithish Kumar',
      citizen_phone: '+919840998877',
      citizen_email: 'citizen@gmail.com',
      title: 'High-voltage cable hanging dangerously across pedestrian crossing',
      category_id: 5,
      category_name: 'Electrical Line Problems',
      description: 'Overhead transformer line snapped during heavy wind and is dangling 4 feet above the sidewalk near Usman Road junction. Heavy pedestrian movement, extreme electrocution hazard.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'T. Nagar Commercial Hub',
      address_landmark: 'Near Panagal Park Bus Stop, Usman Road',
      latitude: 13.0425,
      longitude: 80.2338,
      urgency_level: 'Critical',
      status: 'In Progress',
      priority_score: 94.5,
      priority_level: 'Critical',
      assigned_department_id: 4,
      assigned_official_id: 2,
      upvote_count: 48,
      images: ['/assets/images/complaints/electrical_wire.jpg'],
      resolution_remarks: 'Line repair gang dispatched with emergency crane vehicle.',
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 2,
      tracking_id: 'SC360-2026-1002',
      citizen_id: 5,
      citizen_name: 'Dr. Aruna Ramesh',
      citizen_phone: '+919710334455',
      citizen_email: 'aruna.ramesh@gmail.com',
      title: 'Severely flooded stormwater drain flooding residential basements',
      category_id: 9,
      category_name: 'Flooding and Waterlogging',
      description: 'Stormwater canal culvert completely choked with garbage sacks. Stagnant knee-deep sewage water has entered 8 apartment basements on 100ft Bye-pass road.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'Velachery Stormwater Basin',
      address_landmark: 'Opposite Grand Mall, 100 Feet Bypass Road',
      latitude: 12.9822,
      longitude: 80.2195,
      urgency_level: 'Critical',
      status: 'Assigned to Department',
      priority_score: 87.0,
      priority_level: 'Critical',
      assigned_department_id: 5,
      assigned_official_id: null,
      upvote_count: 36,
      images: ['/assets/images/complaints/flooding_water.jpg'],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 3,
      tracking_id: 'SC360-2026-1003',
      citizen_id: 4,
      citizen_name: 'Suresh Varma',
      citizen_phone: '+919884012345',
      citizen_email: 'suresh.varma@gmail.com',
      title: 'Massive crater pothole causing 3 two-wheeler accidents',
      category_id: 2,
      category_name: 'Damaged Roads and Potholes',
      description: 'Deep road cave-in measuring 4ft wide and 10 inches deep right in the center of the main road. Multiple motorists fell in the dark.',
      state: 'Tamil Nadu',
      district: 'Chengalpattu',
      city: 'Tambaram',
      area_name: 'Tambaram Transit Junction',
      address_landmark: 'GST Road near Tambaram Sanatorium Bridge',
      latitude: 12.9261,
      longitude: 80.1025,
      urgency_level: 'High',
      status: 'Under Review',
      priority_score: 82.3,
      priority_level: 'Critical',
      assigned_department_id: 2,
      assigned_official_id: 2,
      upvote_count: 29,
      images: ['/assets/images/complaints/pothole_road.jpg'],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 4,
      tracking_id: 'SC360-2026-1004',
      citizen_id: 4,
      citizen_name: 'Meena Natarajan',
      citizen_phone: '+919444123890',
      citizen_email: 'meena.n@yahoo.com',
      title: 'Underground drinking water main burst - pure water wasted',
      category_id: 4,
      category_name: 'Water Pipeline Leakage',
      description: 'High pressure drinking water pipe burst under the pavement. Thousands of liters of purified water gushing into road for 36 hours while 200 homes have zero water pressure.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'Mylapore Cultural Quarter',
      address_landmark: 'Near Kapaleeshwarar South Mada Street',
      latitude: 13.0345,
      longitude: 80.2690,
      urgency_level: 'High',
      status: 'In Progress',
      priority_score: 73.8,
      priority_level: 'High',
      assigned_department_id: 3,
      assigned_official_id: 3,
      upvote_count: 24,
      images: ['/assets/images/complaints/water_leakage.jpg'],
      resolution_remarks: 'Excavation team isolated the valve and replacement pipeline is being welded.',
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 5,
      tracking_id: 'SC360-2026-1005',
      citizen_id: 5,
      citizen_name: 'Karthik Subbaraj',
      citizen_phone: '+919962001122',
      citizen_email: 'karthik.s@gmail.com',
      title: 'Community garbage dumpster overflowing onto 2nd Avenue for 5 days',
      category_id: 7,
      category_name: 'Garbage Collection',
      description: 'Solid waste compactor bin hasn’t been cleared for almost a week. Street dogs and cattle scattering rotting organic waste across the road creating severe stench and hygiene risk.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'Anna Nagar West Zone',
      address_landmark: 'Near Roundtana, 2nd Avenue Corner',
      latitude: 13.0862,
      longitude: 80.2115,
      urgency_level: 'Medium',
      status: 'Acknowledged',
      priority_score: 52.4,
      priority_level: 'Medium',
      assigned_department_id: 6,
      assigned_official_id: null,
      upvote_count: 17,
      images: ['/assets/images/complaints/garbage_overflow.jpg'],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 50).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 6,
      tracking_id: 'SC360-2026-1006',
      citizen_id: 4,
      citizen_name: 'Priyanka Sen',
      citizen_phone: '+919884556677',
      citizen_email: 'priyanka.sen@gmail.com',
      title: 'Entire stretch of 8 streetlights dark - safety hazard for women at night',
      category_id: 1,
      category_name: 'Streetlight Problems',
      description: 'Streetlights on Gandhi Nagar 4th Main have been dead for 2 weeks. Several women and senior citizens feel unsafe walking after sunset.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'Adyar Green Sector',
      address_landmark: 'Gandhi Nagar 4th Main Road, near Adyar Club Gate',
      latitude: 13.0028,
      longitude: 80.2542,
      urgency_level: 'Medium',
      status: 'Resolved',
      priority_score: 28.0,
      priority_level: 'Low',
      assigned_department_id: 4,
      assigned_official_id: 2,
      upvote_count: 14,
      images: ['/assets/images/complaints/streetlight_dark.jpg'],
      resolution_remarks: 'Replaced faulty timer relay and installed new 90W LED luminaires along the entire stretch. All 8 lights verified functional.',
      resolved_at: new Date(Date.now() - 3600000 * 14).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 14).toISOString()
    },
    {
      id: 7,
      tracking_id: 'SC360-2026-1007',
      citizen_id: 5,
      citizen_name: 'Ramesh Raghavan',
      citizen_phone: '+919710889900',
      citizen_email: 'raghavan.r@gmail.com',
      title: 'Old Banyan tree limb cracked and resting precariously on road power line',
      category_id: 10,
      category_name: 'Fallen Trees',
      description: 'Large heavy branch snapped halfway and is resting on 440V overhead lines. Strong wind could bring down the entire pole.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'Mylapore Cultural Quarter',
      address_landmark: 'Luz Church Road near Nageswara Rao Park',
      latitude: 13.0382,
      longitude: 80.2648,
      urgency_level: 'High',
      status: 'Under Review',
      priority_score: 69.1,
      priority_level: 'High',
      assigned_department_id: 8,
      assigned_official_id: null,
      upvote_count: 22,
      images: ['/assets/images/complaints/fallen_tree.jpg'],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 6).toISOString()
    },
    {
      id: 8,
      tracking_id: 'SC360-2026-1008',
      citizen_id: 4,
      citizen_name: 'Deepak Chopra',
      citizen_phone: '+919841223399',
      citizen_email: 'deepak.c@outlook.com',
      title: 'Four-way intersection traffic signal stuck on blinking yellow',
      category_id: 11,
      category_name: 'Traffic and Road Safety',
      description: 'Heavy junction traffic signal non-operational since morning. Gridlock extending for 1.5 km during peak office rush.',
      state: 'Tamil Nadu',
      district: 'Chennai',
      city: 'Chennai',
      area_name: 'T. Nagar Commercial Hub',
      address_landmark: 'G.N. Chetty Road Junction at Vani Mahal',
      latitude: 13.0450,
      longitude: 80.2410,
      urgency_level: 'High',
      status: 'Assigned to Department',
      priority_score: 78.4,
      priority_level: 'High',
      assigned_department_id: 7,
      assigned_official_id: null,
      upvote_count: 31,
      images: ['/assets/images/complaints/traffic_jam.jpg'],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 3).toISOString()
    }
  ],
  complaint_status_history: [
    {
      id: 1,
      complaint_id: 1,
      previous_status: 'Submitted',
      new_status: 'Acknowledged',
      changed_by_name: 'System Dispatcher',
      remarks: 'Complaint registered and assigned tracking ticket.',
      created_at: new Date(Date.now() - 3600000 * 17).toISOString()
    },
    {
      id: 2,
      complaint_id: 1,
      previous_status: 'Acknowledged',
      new_status: 'Under Review',
      changed_by_name: 'Control Room Officer',
      remarks: 'Severity verified as Critical due to proximity to bus stop.',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: 3,
      complaint_id: 1,
      previous_status: 'Under Review',
      new_status: 'Assigned to Department',
      changed_by_name: 'Control Room Officer',
      remarks: 'Forwarded to Electricity Board & Power Distribution (T. Nagar substation).',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString()
    },
    {
      id: 4,
      complaint_id: 1,
      previous_status: 'Assigned to Department',
      new_status: 'In Progress',
      changed_by_name: 'Chief Municipal Engineer',
      remarks: 'Line repair gang dispatched with emergency crane vehicle.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 5,
      complaint_id: 6,
      previous_status: 'Submitted',
      new_status: 'In Progress',
      changed_by_name: 'Electricity Board',
      remarks: 'Replaced electrical junction relays.',
      created_at: new Date(Date.now() - 3600000 * 30).toISOString()
    },
    {
      id: 6,
      complaint_id: 6,
      previous_status: 'In Progress',
      new_status: 'Resolved',
      changed_by_name: 'Chief Municipal Engineer',
      remarks: 'Replaced faulty timer relay and installed new 90W LED luminaires along the entire stretch. All 8 lights verified functional.',
      created_at: new Date(Date.now() - 3600000 * 14).toISOString()
    }
  ],
  complaint_support: [
    { id: 1, complaint_id: 1, citizen_phone: '+919840112233', created_at: new Date().toISOString() },
    { id: 2, complaint_id: 1, citizen_phone: '+919840223344', created_at: new Date().toISOString() },
    { id: 3, complaint_id: 2, citizen_phone: '+919710334455', created_at: new Date().toISOString() }
  ],
  government_integration_logs: [
    {
      id: 1,
      complaint_id: 1,
      department_id: 4,
      endpoint_url: 'https://api.smartcity360.gov.in/v1/grievance',
      request_payload: '{"ticketId":"SC360-2026-1001","dept":"POWER","priority":"CRITICAL"}',
      response_payload: '{"status":"ACCEPTED","govRef":"TANGEDCO-2026-88192"}',
      external_reference_id: 'TANGEDCO-2026-88192',
      status: 'SUCCESS',
      retry_count: 0,
      synced_at: new Date(Date.now() - 3600000 * 7).toISOString()
    },
    {
      id: 2,
      complaint_id: 3,
      department_id: 2,
      endpoint_url: 'https://api.smartcity360.gov.in/v1/grievance',
      request_payload: '{"ticketId":"SC360-2026-1003","dept":"ROADS","priority":"CRITICAL"}',
      response_payload: '{"status":"ACCEPTED","govRef":"HD-PWD-2026-55410"}',
      external_reference_id: 'HD-PWD-2026-55410',
      status: 'SUCCESS',
      retry_count: 0,
      synced_at: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ]
};

// Helper: load local db from disk or init
function loadLocalDb() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      memoryDb = JSON.parse(raw);
    } else {
      memoryDb = JSON.parse(JSON.stringify(initialSeedData));
      saveLocalDb();
    }
  } catch (err) {
    console.error('Error reading local data file, using fresh seed data:', err.message);
    memoryDb = JSON.parse(JSON.stringify(initialSeedData));
  }
}

function saveLocalDb() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save to local data file:', err.message);
  }
}

// Helper to parse database configuration from DATABASE_URL or individual variables
function parseDatabaseConfig() {
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 3306,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname.replace(/^\//, ''),
        ssl: (process.env.DB_SSL === 'true' || parsed.searchParams.get('ssl') === 'true' || parsed.searchParams.get('sslmode') === 'require') ? { rejectUnauthorized: false } : undefined
      };
    } catch (e) {
      console.warn('Could not parse DATABASE_URL, using individual DB_* vars');
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_city_360',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

// Initialize database connection
async function initDb() {
  const dbType = process.env.DB_TYPE || 'auto';
  const cfg = parseDatabaseConfig();
  
  if (dbType === 'mysql' || process.env.DATABASE_URL) {
    try {
      pool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl,
        waitForConnections: true,
        connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
        queueLimit: 0
      });
      // Test connection
      const conn = await pool.getConnection();
      console.log(`✓ Successfully connected to MySQL database: ${cfg.database} at ${cfg.host}:${cfg.port}`);
      conn.release();
      useLocalMode = false;
      return;
    } catch (err) {
      console.warn(`! MySQL connection failed (${err.message}). Switching seamlessly to zero-config file-backed storage.`);
      useLocalMode = true;
      loadLocalDb();
      return;
    }
  }

  // Auto mode or fallback
  try {
    if (process.env.DB_HOST && process.env.DB_NAME) {
      pool = mysql.createPool({
        host: cfg.host,
        port: cfg.port,
        user: cfg.user,
        password: cfg.password,
        database: cfg.database,
        ssl: cfg.ssl,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 2000
      });
      const conn = await pool.getConnection();
      console.log('✓ Connected to MySQL database');
      conn.release();
      useLocalMode = false;
      return;
    }
  } catch (e) {
    // Expected when mysql is not running
  }

  console.log('⚡ Smart City 360 running in zero-config file storage mode (backed by backend/database/data.json).');
  console.log('  All changes, complaints, upvotes, and statuses persist to disk automatically.');
  useLocalMode = true;
  loadLocalDb();
}

// Priority Calculation Formula according to Section 7 of specification:
// Priority Score = (Report Frequency × 30%) + (Unresolved Complaints × 25%) + (Severity × 20%) + (Recency × 15%) + (Unique Reporters × 10%)
function calculateScore(complaint, areaComplaints = [], settings = {}) {
  const weights = {
    freq: Number(settings.priority_weight_frequency) || 0.30,
    unres: Number(settings.priority_weight_unresolved) || 0.25,
    sev: Number(settings.priority_weight_severity) || 0.20,
    rec: Number(settings.priority_weight_recency) || 0.15,
    rep: Number(settings.priority_weight_reporters) || 0.10
  };

  // 1. Report frequency in area (scaled 0-100)
  const areaReportCount = areaComplaints.length || 1;
  const freqScore = Math.min(100, (areaReportCount / 20) * 100);

  // 2. Unresolved complaints in area (scaled 0-100)
  const unresolvedInArea = areaComplaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length;
  const unresScore = Math.min(100, (unresolvedInArea / 15) * 100);

  // 3. Severity (Critical: 100, High: 75, Medium: 50, Low: 25)
  const sevMap = { Critical: 100, High: 75, Medium: 50, Low: 25 };
  const sevScore = sevMap[complaint.urgency_level] || 50;

  // 4. Recency (reports in last 24h get 100, last 72h get 75, last 7 days get 50, older 25)
  const ageHours = (Date.now() - new Date(complaint.created_at || Date.now()).getTime()) / 3600000;
  let recScore = 25;
  if (ageHours <= 24) recScore = 100;
  else if (ageHours <= 72) recScore = 75;
  else if (ageHours <= 168) recScore = 50;

  // 5. Unique reporters / upvotes (scaled 0-100)
  const supporters = (complaint.upvote_count || 0) + 1;
  const repScore = Math.min(100, (supporters / 15) * 100);

  const finalScore = (
    freqScore * weights.freq +
    unresScore * weights.unres +
    sevScore * weights.sev +
    recScore * weights.rec +
    repScore * weights.rep
  );

  const rounded = Number(finalScore.toFixed(1));
  let level = 'Low';
  if (rounded >= (Number(settings.threshold_critical) || 80)) level = 'Critical';
  else if (rounded >= (Number(settings.threshold_high) || 60)) level = 'High';
  else if (rounded >= (Number(settings.threshold_medium) || 35)) level = 'Medium';

  return { score: rounded, level };
}

// Generic Query Interface
async function query(sql, params = []) {
  if (!useLocalMode && pool) {
    const [rows] = await pool.query(sql, params);
    return rows;
  }
  // Local fallback: queries are handled by specific helper methods below
  return [];
}

// Data Access Methods
const db = {
  isLocalMode: () => useLocalMode,
  
  async getCategories() {
    if (!useLocalMode && pool) {
      const [rows] = await pool.query('SELECT * FROM complaint_categories WHERE is_active = 1 ORDER BY id ASC');
      return rows;
    }
    return memoryDb.complaint_categories || [];
  },

  async getDepartments() {
    if (!useLocalMode && pool) {
      const [rows] = await pool.query('SELECT * FROM departments ORDER BY id ASC');
      return rows;
    }
    return memoryDb.departments || [];
  },

  async getGeographicAreas() {
    if (!useLocalMode && pool) {
      const [rows] = await pool.query('SELECT * FROM geographic_areas ORDER BY priority_score DESC');
      return rows;
    }
    // Update live counts dynamically
    const areas = (memoryDb.geographic_areas || []).map(area => {
      const areaComplaints = (memoryDb.complaints || []).filter(c => c.area_name.toLowerCase().includes(area.name.toLowerCase()) || area.name.toLowerCase().includes(c.area_name.toLowerCase()));
      const total = areaComplaints.length;
      const unres = areaComplaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length;
      return {
        ...area,
        total_reports: total > 0 ? total : area.total_reports,
        unresolved_count: unres > 0 ? unres : area.unresolved_count
      };
    });
    return areas.sort((a, b) => b.priority_score - a.priority_score);
  },

  async getComplaints(filters = {}) {
    if (!useLocalMode && pool) {
      let sql = 'SELECT * FROM complaints WHERE 1=1';
      const params = [];
      if (filters.category_id) {
        sql += ' AND category_id = ?';
        params.push(filters.category_id);
      }
      if (filters.priority_level) {
        sql += ' AND priority_level = ?';
        params.push(filters.priority_level);
      }
      if (filters.status) {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.search) {
        sql += ' AND (title LIKE ? OR description LIKE ? OR area_name LIKE ? OR tracking_id LIKE ?)';
        const term = `%${filters.search}%`;
        params.push(term, term, term, term);
      }
      sql += ' ORDER BY priority_score DESC, created_at DESC';
      const [rows] = await pool.query(sql, params);
      return rows;
    }

    let list = [...(memoryDb.complaints || [])];

    if (filters.category_id) {
      list = list.filter(c => String(c.category_id) === String(filters.category_id));
    }
    if (filters.priority_level) {
      list = list.filter(c => c.priority_level.toLowerCase() === filters.priority_level.toLowerCase());
    }
    if (filters.status) {
      list = list.filter(c => c.status.toLowerCase() === filters.status.toLowerCase());
    }
    if (filters.department_id) {
      list = list.filter(c => String(c.assigned_department_id) === String(filters.department_id));
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(c => 
        (c.title && c.title.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.area_name && c.area_name.toLowerCase().includes(q)) ||
        (c.tracking_id && c.tracking_id.toLowerCase().includes(q)) ||
        (c.address_landmark && c.address_landmark.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
  },

  async getComplaintById(identifier) {
    if (!useLocalMode && pool) {
      const [rows] = await pool.query(
        'SELECT * FROM complaints WHERE id = ? OR tracking_id = ? LIMIT 1',
        [identifier, identifier]
      );
      if (!rows.length) return null;
      const complaint = rows[0];
      const [history] = await pool.query(
        'SELECT * FROM complaint_status_history WHERE complaint_id = ? ORDER BY created_at ASC',
        [complaint.id]
      );
      complaint.history = history;
      return complaint;
    }

    const complaint = (memoryDb.complaints || []).find(
      c => String(c.id) === String(identifier) || (c.tracking_id && c.tracking_id.toUpperCase() === String(identifier).toUpperCase())
    );

    if (!complaint) return null;

    const history = (memoryDb.complaint_status_history || [])
      .filter(h => String(h.complaint_id) === String(complaint.id))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    return { ...complaint, history };
  },

  async createComplaint(data) {
    // Generate unique tracking ID: SC360-YYYY-RANDOM5
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const tracking_id = `SC360-${year}-${randomHex}`;

    // Lookup category details
    const categories = await this.getCategories();
    const cat = categories.find(c => String(c.id) === String(data.category_id)) || { name: 'Civic Issue', default_department_id: 1, base_severity: 'Medium' };

    const newId = (memoryDb.complaints.length > 0 ? Math.max(...memoryDb.complaints.map(c => c.id || 0)) : 0) + 1;

    // Recalculate priority based on formula
    const areaComplaints = memoryDb.complaints.filter(c => c.area_name && data.area_name && c.area_name.toLowerCase() === data.area_name.toLowerCase());
    const settings = memoryDb.administrator_settings || {};
    const { score, level } = calculateScore({
      urgency_level: data.urgency_level || cat.base_severity || 'Medium',
      upvote_count: 0,
      created_at: new Date()
    }, areaComplaints, settings);

    const complaintRecord = {
      id: newId,
      tracking_id,
      citizen_id: data.citizen_id || null,
      citizen_name: data.citizen_name,
      citizen_phone: data.citizen_phone,
      citizen_email: data.citizen_email || null,
      title: data.title,
      category_id: Number(data.category_id),
      category_name: cat.name,
      description: data.description,
      state: data.state || 'Tamil Nadu',
      district: data.district || 'Chennai',
      city: data.city || 'Chennai',
      area_name: data.area_name,
      address_landmark: data.address_landmark,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      urgency_level: data.urgency_level || 'Medium',
      status: 'Submitted',
      priority_score: score,
      priority_level: level,
      assigned_department_id: cat.default_department_id || 1,
      assigned_official_id: null,
      upvote_count: 0,
      images: data.images || [],
      resolution_remarks: null,
      resolved_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    memoryDb.complaints.unshift(complaintRecord);

    // Initial audit history entry
    const historyId = (memoryDb.complaint_status_history.length > 0 ? Math.max(...memoryDb.complaint_status_history.map(h => h.id || 0)) : 0) + 1;
    memoryDb.complaint_status_history.push({
      id: historyId,
      complaint_id: newId,
      previous_status: null,
      new_status: 'Submitted',
      changed_by_name: data.citizen_name || 'Citizen',
      remarks: 'Complaint registered by citizen via web application portal.',
      created_at: new Date().toISOString()
    });

    saveLocalDb();
    return complaintRecord;
  },

  async updateComplaintStatus(complaintId, newStatus, remarks = '', user = { name: 'Official' }, departmentId = null, resolutionImages = []) {
    const complaint = (memoryDb.complaints || []).find(c => String(c.id) === String(complaintId));
    if (!complaint) throw new Error('Complaint not found');

    const prevStatus = complaint.status;
    complaint.status = newStatus;
    complaint.updated_at = new Date().toISOString();

    if (remarks) complaint.resolution_remarks = remarks;
    if (departmentId) complaint.assigned_department_id = Number(departmentId);
    if (resolutionImages && resolutionImages.length > 0) {
      complaint.resolution_images = resolutionImages;
    }

    if (['Resolved', 'Closed'].includes(newStatus)) {
      complaint.resolved_at = new Date().toISOString();
      // Lower priority upon resolution
      complaint.priority_score = Math.max(10, complaint.priority_score - 40);
      complaint.priority_level = 'Low';
    } else if (newStatus === 'Reopened') {
      complaint.priority_score = Math.min(100, complaint.priority_score + 25);
      if (complaint.priority_score >= 80) complaint.priority_level = 'Critical';
      else if (complaint.priority_score >= 60) complaint.priority_level = 'High';
    }

    // Add audit history
    const historyId = (memoryDb.complaint_status_history.length > 0 ? Math.max(...memoryDb.complaint_status_history.map(h => h.id || 0)) : 0) + 1;
    memoryDb.complaint_status_history.push({
      id: historyId,
      complaint_id: complaint.id,
      previous_status: prevStatus,
      new_status: newStatus,
      changed_by_name: user.full_name || user.name || 'Government Official',
      remarks: remarks || `Status changed from ${prevStatus} to ${newStatus}`,
      created_at: new Date().toISOString()
    });

    saveLocalDb();
    return complaint;
  },

  async supportComplaint(complaintId, citizenPhone = 'Anonymous', ip = '') {
    const complaint = (memoryDb.complaints || []).find(c => String(c.id) === String(complaintId));
    if (!complaint) throw new Error('Complaint not found');

    // Duplicate support check
    const existing = (memoryDb.complaint_support || []).find(
      s => String(s.complaint_id) === String(complaintId) && s.citizen_phone === citizenPhone && citizenPhone !== 'Anonymous'
    );
    if (existing) {
      return { alreadySupported: true, upvote_count: complaint.upvote_count };
    }

    const newSupportId = (memoryDb.complaint_support.length > 0 ? Math.max(...memoryDb.complaint_support.map(s => s.id || 0)) : 0) + 1;
    memoryDb.complaint_support.push({
      id: newSupportId,
      complaint_id: complaint.id,
      citizen_phone: citizenPhone,
      ip_address: ip,
      created_at: new Date().toISOString()
    });

    complaint.upvote_count = (complaint.upvote_count || 0) + 1;
    // Boost priority score slightly due to community confirmation (+1.5 points)
    complaint.priority_score = Math.min(100, Number((complaint.priority_score + 1.5).toFixed(1)));
    if (complaint.priority_score >= 80) complaint.priority_level = 'Critical';
    else if (complaint.priority_score >= 60) complaint.priority_level = 'High';

    saveLocalDb();
    return { alreadySupported: false, upvote_count: complaint.upvote_count, priority_score: complaint.priority_score };
  },

  async findDuplicateNearby(lat, lng, categoryId, radiusKm = 0.3) {
    const list = memoryDb.complaints || [];
    function distance(lat1, lon1, lat2, lon2) {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }

    const matches = list.filter(c => {
      if (['Resolved', 'Closed'].includes(c.status)) return false;
      if (categoryId && String(c.category_id) !== String(categoryId)) return false;
      const dist = distance(Number(lat), Number(lng), Number(c.latitude), Number(c.longitude));
      return dist <= radiusKm;
    });

    return matches;
  },

  async getStats() {
    const list = memoryDb.complaints || [];
    const total = list.length;
    const pending = list.filter(c => ['Submitted', 'Acknowledged'].includes(c.status)).length;
    const underReview = list.filter(c => c.status === 'Under Review').length;
    const inProgress = list.filter(c => ['Assigned to Department', 'In Progress'].includes(c.status)).length;
    const resolved = list.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
    const highPriority = list.filter(c => ['High', 'Critical'].includes(c.priority_level)).length;

    // Category breakdown
    const categoryCounts = {};
    list.forEach(c => {
      const name = c.category_name || 'General';
      categoryCounts[name] = (categoryCounts[name] || 0) + 1;
    });

    // Priority breakdown
    const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    list.forEach(c => {
      const p = c.priority_level || 'Low';
      if (priorityCounts[p] !== undefined) priorityCounts[p]++;
    });

    // Department breakdown
    const departments = memoryDb.departments || [];
    const departmentStats = departments.map(d => {
      const deptComplaints = list.filter(c => Number(c.assigned_department_id) === Number(d.id));
      const res = deptComplaints.filter(c => ['Resolved', 'Closed'].includes(c.status)).length;
      return {
        id: d.id,
        name: d.name,
        total: deptComplaints.length,
        resolved: res,
        pending: deptComplaints.length - res,
        rate: deptComplaints.length > 0 ? Math.round((res / deptComplaints.length) * 100) : 100
      };
    });

    return {
      total,
      pending,
      underReview,
      inProgress,
      resolved,
      highPriority,
      categoryCounts,
      priorityCounts,
      departmentStats
    };
  },

  async getSettings() {
    return memoryDb.administrator_settings || {};
  },

  async updateSettings(newSettings) {
    memoryDb.administrator_settings = {
      ...memoryDb.administrator_settings,
      ...newSettings
    };
    saveLocalDb();
    return memoryDb.administrator_settings;
  },

  async getIntegrationLogs() {
    return memoryDb.government_integration_logs || [];
  },

  async addIntegrationLog(log) {
    const newId = (memoryDb.government_integration_logs.length > 0 ? Math.max(...memoryDb.government_integration_logs.map(l => l.id || 0)) : 0) + 1;
    const entry = {
      id: newId,
      ...log,
      synced_at: new Date().toISOString()
    };
    memoryDb.government_integration_logs.unshift(entry);
    saveLocalDb();
    return entry;
  },

  async findUserByEmail(email) {
    return (memoryDb.users || []).find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  async createUser(userData) {
    const newId = (memoryDb.users.length > 0 ? Math.max(...memoryDb.users.map(u => u.id || 0)) : 0) + 1;
    const user = {
      id: newId,
      ...userData,
      is_active: 1,
      created_at: new Date().toISOString()
    };
    memoryDb.users.push(user);
    saveLocalDb();
    return user;
  }
};

module.exports = { initDb, query, db, calculateScore };
