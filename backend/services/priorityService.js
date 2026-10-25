/**
 * Smart City 360 - Priority Identification Service
 * Implements Section 7: Intelligent Community-Based Priority Identification System
 */

const { db, calculateScore } = require('../config/db');

class PriorityService {
  /**
   * Recalculates and updates priority scores for all active complaints
   */
  static async recalculateAllPriorities() {
    const complaints = await db.getComplaints();
    const settings = await db.getSettings();
    const areas = await db.getGeographicAreas();

    // Group complaints by area
    const areaMap = {};
    for (const c of complaints) {
      const area = c.area_name || 'General';
      if (!areaMap[area]) areaMap[area] = [];
      areaMap[area].push(c);
    }

    // Update each complaint's score
    for (const complaint of complaints) {
      const areaGroup = areaMap[complaint.area_name || 'General'] || [];
      const { score, level } = calculateScore(complaint, areaGroup, settings);
      complaint.priority_score = score;
      complaint.priority_level = level;
    }

    // Update geographic area aggregates
    const updatedAreas = areas.map(area => {
      const matchedComplaints = complaints.filter(c => 
        c.area_name && (c.area_name.toLowerCase().includes(area.name.toLowerCase()) || area.name.toLowerCase().includes(c.area_name.toLowerCase()))
      );
      const total = matchedComplaints.length;
      const unresolved = matchedComplaints.filter(c => !['Resolved', 'Closed'].includes(c.status)).length;
      
      // Calculate area average priority
      let areaScore = 0;
      if (matchedComplaints.length > 0) {
        const sum = matchedComplaints.reduce((acc, curr) => acc + (curr.priority_score || 0), 0);
        areaScore = Number((sum / matchedComplaints.length).toFixed(1));
      } else {
        areaScore = area.priority_score || 20;
      }

      let riskLevel = 'Low';
      if (areaScore >= (Number(settings.threshold_critical) || 80)) riskLevel = 'Critical';
      else if (areaScore >= (Number(settings.threshold_high) || 60)) riskLevel = 'High';
      else if (areaScore >= (Number(settings.threshold_medium) || 35)) riskLevel = 'Medium';

      return {
        ...area,
        total_reports: total,
        unresolved_count: unresolved,
        priority_score: areaScore,
        risk_level: riskLevel,
        top_category: this.getTopCategory(matchedComplaints)
      };
    });

    return {
      complaints,
      areas: updatedAreas.sort((a, b) => b.priority_score - a.priority_score)
    };
  }

  static getTopCategory(complaintList) {
    if (!complaintList || complaintList.length === 0) return 'Various Issues';
    const counts = {};
    for (const c of complaintList) {
      counts[c.category_name] = (counts[c.category_name] || 0) + 1;
    }
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, 'Civic Issues');
  }

  /**
   * Generates analytical intelligence highlights for dashboard and home page
   */
  static async getIntelligenceHighlights() {
    const complaints = await db.getComplaints();
    const areas = await db.getGeographicAreas();

    // 1. Highest priority neighbourhood
    const highestPriorityArea = areas.length > 0 ? areas[0] : null;

    // 2. Most frequently reported problem category
    const catMap = {};
    for (const c of complaints) {
      const cat = c.category_name || 'General';
      catMap[cat] = (catMap[cat] || 0) + 1;
    }
    let topCategory = 'None';
    let topCategoryCount = 0;
    for (const [cat, count] of Object.entries(catMap)) {
      if (count > topCategoryCount) {
        topCategory = cat;
        topCategoryCount = count;
      }
    }

    // 3. Area with most unresolved complaints
    const unresolvedByArea = [...areas].sort((a, b) => b.unresolved_count - a.unresolved_count);
    const mostUnresolvedArea = unresolvedByArea.length > 0 ? unresolvedByArea[0] : null;

    // 4. Repeated safety complaints (Electrical, Flooding, Fallen Trees, Traffic)
    const safetyComplaints = complaints.filter(c => 
      ['Electrical Line Problems', 'Flooding and Waterlogging', 'Fallen Trees', 'Traffic and Road Safety'].includes(c.category_name) &&
      !['Resolved', 'Closed'].includes(c.status)
    );

    // 5. Ranked Priority Highlights Cards (top 6 complaints requiring immediate attention)
    const rankedComplaints = complaints
      .filter(c => !['Resolved', 'Closed'].includes(c.status))
      .slice(0, 6);

    return {
      highestPriorityArea,
      topCategory: { name: topCategory, count: topCategoryCount },
      mostUnresolvedArea,
      safetyComplaintsCount: safetyComplaints.length,
      rankedComplaints,
      areaRankings: areas
    };
  }
}

module.exports = PriorityService;
