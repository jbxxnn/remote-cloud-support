"use client";
import { useState, useEffect, useCallback } from "react";

interface Detection {
  id: string;
  detectionType: string;
  confidence: number;
  severity: string;
  location?: string;
  clipUrl?: string;
  timestamp: string;
  client: {
    id: string;
    name: string;
    company?: string;
  };
  device: {
    id: string;
    name: string;
    deviceId: string;
  };
}

interface DetectionStats {
  total: number;
  today: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export default function DetectionDashboard() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [stats, setStats] = useState<DetectionStats>({
    total: 0,
    today: 0,
    byType: {},
    bySeverity: {}
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    clientId: "",
    deviceId: "",
    detectionType: "",
    severity: "",
    timeRange: "24h"
  });

  const fetchDetections = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.clientId) params.append('clientId', filter.clientId);
      if (filter.deviceId) params.append('deviceId', filter.deviceId);
      if (filter.detectionType) params.append('detectionType', filter.detectionType);
      if (filter.severity) params.append('severity', filter.severity);
      if (filter.timeRange) params.append('timeRange', filter.timeRange);

      const response = await fetch(`/api/detections?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDetections(data);
      }
    } catch (error) {
      console.error("Failed to fetch detections:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/detections/stats");
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchDetections();
    fetchStats();
    
    // Set up real-time updates every 5 seconds
    const interval = setInterval(() => {
      fetchDetections();
      fetchStats();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchDetections, fetchStats]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDetectionTypeIcon = (type: string) => {
    switch (type) {
      case 'person': return '👤';
      case 'fall': return '⚠️';
      case 'motion': return '🏃';
      default: return '📹';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="text-center py-8">Loading detections...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Detections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">👤</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Person Detections</p>
              <p className="text-2xl font-bold text-gray-900">{stats.byType.person || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Severity</p>
              <p className="text-2xl font-bold text-gray-900">
                {(stats.bySeverity.high || 0) + (stats.bySeverity.critical || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Time Range</label>
            <select
              value={filter.timeRange}
              onChange={(e) => setFilter({...filter, timeRange: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Detection Type</label>
            <select
              value={filter.detectionType}
              onChange={(e) => setFilter({...filter, detectionType: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="person">Person</option>
              <option value="fall">Fall</option>
              <option value="motion">Motion</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Severity</label>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({...filter, severity: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Client</label>
            <input
              type="text"
              placeholder="Filter by client"
              value={filter.clientId}
              onChange={(e) => setFilter({...filter, clientId: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Device</label>
            <input
              type="text"
              placeholder="Filter by device"
              value={filter.deviceId}
              onChange={(e) => setFilter({...filter, deviceId: e.target.value})}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Detections List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Detections ({detections.length})</h3>
        </div>
        
        {detections.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📹</span>
            <p className="text-gray-500">No detections found. Detections will appear here in real-time.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {detections.map((detection) => (
              <div key={detection.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="text-2xl">
                      {getDetectionTypeIcon(detection.detectionType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-lg font-semibold capitalize">
                          {detection.detectionType} Detection
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(detection.severity)}`}>
                          {detection.severity}
                        </span>
                        <span className="text-sm text-gray-500">
                          {Math.round(detection.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Client:</span> {detection.client.name}
                          {detection.client.company && ` (${detection.client.company})`}
                        </div>
                        <div>
                          <span className="font-medium">Device:</span> {detection.device.name}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {detection.location || 'Unknown'}
                        </div>
                      </div>
                      
                      {detection.clipUrl && (
                        <div className="mt-2">
                          <a
                            href={detection.clipUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            📹 View Clip
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {formatTime(detection.timestamp)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(detection.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 