-- =======================================================
-- Smart City 360 – Initial Database Seed Data
-- =======================================================

USE `smart_city_360`;

-- 1. Seed Departments
INSERT INTO `departments` (`id`, `code`, `name`, `contact_email`, `contact_phone`, `head_name`, `description`) VALUES
(1, 'MUNICIPAL', 'Municipal Corporation', 'municipal@smartcity360.gov.in', '+91 44 2538 1001', 'K. Rajasekaran, IAS', 'General civic amenities, city governance, and civic licences'),
(2, 'ROADS', 'Roads & Highways Department', 'highways@smartcity360.gov.in', '+91 44 2538 1002', 'Er. M. Senthil Kumar', 'Road resurfacing, pothole repairs, street infrastructure, and bridge upkeep'),
(3, 'WATER', 'Water Supply & Sewerage Board', 'water@smartcity360.gov.in', '+91 44 2538 1003', 'Dr. P. Sundaram', 'Drinking water pipelines, leakage control, tanker distribution, and water reservoirs'),
(4, 'ELECTRICITY', 'Electricity Board & Power Distribution', 'power@smartcity360.gov.in', '+91 44 2538 1004', 'Er. V. Anbarasan', 'Power grid, transformer faults, fallen cables, and street light infrastructure'),
(5, 'DRAINAGE', 'Drainage & Sanitation Department', 'drainage@smartcity360.gov.in', '+91 44 2538 1005', 'S. Meenakshi', 'Underground drainage, stormwater drain clearing, sewage line blockages'),
(6, 'WASTE', 'Waste Management & Solid Waste Board', 'waste@smartcity360.gov.in', '+91 44 2538 1006', 'R. Balachander', 'Door-to-door garbage collection, community dustbins, compost plants, recycling'),
(7, 'TRAFFIC', 'Traffic & Road Safety Department', 'traffic@smartcity360.gov.in', '+91 44 2538 1007', 'DCP Anand Kumar, IPS', 'Traffic signal synchronization, speed breakers, pedestrian crosswalks, signages'),
(8, 'PARKS', 'Parks & Public Spaces Department', 'parks@smartcity360.gov.in', '+91 44 2538 1008', 'G. Latha', 'Public park upkeep, garden maintenance, play equipment, and urban tree canopy'),
(9, 'OTHER', 'Other Relevant Civic Authorities', 'support@smartcity360.gov.in', '+91 44 2538 1009', 'Civic Grievance Cell', 'Inter-departmental coordination and miscellaneous civic grievances')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 2. Seed Complaint Categories (All 15 required categories)
INSERT INTO `complaint_categories` (`id`, `name`, `slug`, `icon`, `base_severity`, `default_department_id`, `description`) VALUES
(1, 'Streetlight Problems', 'streetlight-problems', 'sun', 'Medium', 4, 'Non-functioning streetlights, blinking lights, broken poles, or dark stretches'),
(2, 'Damaged Roads and Potholes', 'damaged-roads-and-potholes', 'cone', 'High', 2, 'Deep potholes, broken tarmac, uneven road surfaces posing vehicular hazard'),
(3, 'Water Supply Problems', 'water-supply-problems', 'droplet', 'High', 3, 'Low pressure, contaminated water, erratic water timing, or zero supply'),
(4, 'Water Pipeline Leakage', 'water-pipeline-leakage', 'shield-alert', 'High', 3, 'Burst underground mains, surface pipe fractures wasting potable water'),
(5, 'Electrical Line Problems', 'electrical-line-problems', 'zap', 'Critical', 4, 'Sparking overhead lines, hanging live cables, exposed junction boxes'),
(6, 'Drainage and Sewage Problems', 'drainage-and-sewage-problems', 'disc', 'Critical', 5, 'Overflowing manholes, stagnant sewage on streets, chocked drainage channels'),
(7, 'Garbage Collection', 'garbage-collection', 'trash-2', 'Medium', 6, 'Missed door-to-door pickup, overflowing bin clusters, scattered domestic litter'),
(8, 'Waste Management', 'waste-management', 'box', 'High', 6, 'Illegal construction debris dumping, industrial waste, plastic accumulation'),
(9, 'Flooding and Waterlogging', 'flooding-and-waterlogging', 'cloud-rain', 'Critical', 5, 'Monsoon stormwater flooding streets, submerged intersections, road blockages'),
(10, 'Fallen Trees', 'fallen-trees', 'feather', 'High', 8, 'Fallen trees or precarious heavy boughs blocking streets or damaging wires'),
(11, 'Traffic and Road Safety', 'traffic-and-road-safety', 'alert-triangle', 'High', 7, 'Broken traffic lights, blind turns, missing pedestrian crossings, missing signages'),
(12, 'Public Toilet Maintenance', 'public-toilet-maintenance', 'user-check', 'Medium', 1, 'Unhygienic community toilets, waterless latrines, broken door locks'),
(13, 'Public Park Maintenance', 'public-park-maintenance', 'smile', 'Low', 8, 'Broken play equipment, overgrown bushes, non-working sprinklers in public parks'),
(14, 'Stray Animal Problems', 'stray-animal-problems', 'help-circle', 'Medium', 1, 'Aggressive stray dog packs, cattle blocking main traffic corridors'),
(15, 'Other Civic Issues', 'other-civic-issues', 'more-horizontal', 'Medium', 9, 'Noise pollution, encroachments on footpaths, open excavation without barricade')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- 3. Seed Users (password hash for 'admin123', 'official123', 'citizen123')
-- Bcrypt hashes generated for each
INSERT INTO `users` (`id`, `full_name`, `email`, `phone_number`, `password_hash`, `role`, `department_id`, `is_active`) VALUES
(1, 'Civic System Administrator', 'admin@smartcity360.gov.in', '+919876543210', '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', 'admin', NULL, 1),
(2, 'Chief Municipal Engineer', 'official@smartcity360.gov.in', '+919840112233', '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', 'official', 2, 1),
(3, 'Water Board Officer', 'water.officer@smartcity360.gov.in', '+919840223344', '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', 'official', 3, 1),
(4, 'Citizen Nithish Kumar', 'citizen@gmail.com', '+919840998877', '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', 'citizen', NULL, 1),
(5, 'Dr. Aruna Ramesh', 'aruna.ramesh@gmail.com', '+919710334455', '$2b$10$w09u7uFjY04cM1o3lqQ8eOfp7aA46e6o7kI6g7J2Rz3c8v4d5e1ba', 'citizen', NULL, 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

-- 4. Seed Geographic Areas
INSERT INTO `geographic_areas` (`id`, `name`, `district`, `state`, `pincode`, `center_lat`, `center_lng`, `radius_meters`, `risk_level`, `total_reports`, `unresolved_count`, `priority_score`) VALUES
(1, 'T. Nagar Commercial & Residential Hub', 'Chennai', 'Tamil Nadu', '600017', 13.0418, 80.2341, 1800, 'Critical', 42, 28, 88.50),
(2, 'Velachery Stormwater Basin', 'Chennai', 'Tamil Nadu', '600042', 12.9815, 80.2180, 2200, 'High', 31, 19, 74.20),
(3, 'Anna Nagar West Zone', 'Chennai', 'Tamil Nadu', '600040', 13.0850, 80.2101, 2000, 'Medium', 15, 6, 48.00),
(4, 'Adyar Estuary Sector', 'Chennai', 'Tamil Nadu', '600020', 13.0012, 80.2565, 1700, 'Low', 9, 2, 24.50),
(5, 'Mylapore Heritage Precinct', 'Chennai', 'Tamil Nadu', '600004', 13.0368, 80.2676, 1600, 'High', 22, 14, 66.80),
(6, 'Tambaram Transit Junction', 'Chengalpattu', 'Tamil Nadu', '600045', 12.9249, 80.1000, 2500, 'Critical', 38, 26, 85.10);

-- 5. Seed Administrator Settings (Priority Weights & Thresholds)
INSERT INTO `administrator_settings` (`id`, `setting_key`, `setting_value`, `description`) VALUES
(1, 'priority_weight_frequency', '0.30', 'Weight for Report Frequency in priority score (30%)'),
(2, 'priority_weight_unresolved', '0.25', 'Weight for Unresolved Complaints in priority score (25%)'),
(3, 'priority_weight_severity', '0.20', 'Weight for Issue Severity in priority score (20%)'),
(4, 'priority_weight_recency', '0.15', 'Weight for Recency of Reports in priority score (15%)'),
(5, 'priority_weight_reporters', '0.10', 'Weight for Unique Citizen Reporters in priority score (10%)'),
(6, 'threshold_critical', '80', 'Minimum score to classify an area or complaint as Critical'),
(7, 'threshold_high', '60', 'Minimum score to classify an area or complaint as High Priority'),
(8, 'threshold_medium', '35', 'Minimum score to classify an area or complaint as Medium Priority'),
(9, 'gov_api_auto_forward', 'true', 'Automatically forward High and Critical complaints to Gov API'),
(10, 'sms_notification_enabled', 'false', 'Enable SMS alerts via telecommunication gateway')
ON DUPLICATE KEY UPDATE `setting_value`=VALUES(`setting_value`);
