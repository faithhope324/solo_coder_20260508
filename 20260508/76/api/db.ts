import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { WebRtcMetrics, Meeting } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'webrtc-monitor.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface DatabaseSchema {
  meetings: Meeting[];
  metrics: WebRtcMetrics[];
}

let db: DatabaseSchema = {
  meetings: [],
  metrics: []
};

let saveTimer: NodeJS.Timeout | null = null;

function loadDatabase() {
  if (fs.existsSync(dbPath)) {
    try {
      const data = fs.readFileSync(dbPath, 'utf-8');
      db = JSON.parse(data);
      console.log('Loaded existing database from', dbPath);
    } catch (e) {
      console.error('Error loading database:', e);
      db = { meetings: [], metrics: [] };
    }
  } else {
    console.log('Created new database');
  }
}

function saveDatabase() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database:', e);
    }
  }, 500);
}

export async function init(): Promise<void> {
  loadDatabase();
}

export function isInitialized(): boolean {
  return true;
}

export function createMeeting(title: string, participantCount: number): Meeting {
  const id = uuidv4();
  const startTime = Date.now();
  const meeting: Meeting = {
    id,
    title,
    startTime,
    participantCount,
    averageQuality: 0
  };
  db.meetings.push(meeting);
  saveDatabase();
  return meeting;
}

export function endMeeting(meetingId: string, averageQuality: number): void {
  const meeting = db.meetings.find(m => m.id === meetingId);
  if (meeting) {
    meeting.endTime = Date.now();
    meeting.averageQuality = averageQuality;
    saveDatabase();
  }
}

export function insertMetrics(meetingId: string, metrics: WebRtcMetrics): void {
  const metricsWithMeetingId = {
    ...metrics,
    meetingId
  };
  db.metrics.push(metricsWithMeetingId as any);
  saveDatabase();
}

export function getMeetings(limit: number = 50, onlyEnded: boolean = false): Meeting[] {
  return [...db.meetings]
    .filter(m => !onlyEnded || m.endTime !== undefined)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}

export function getEndedMeetings(limit: number = 50): Meeting[] {
  return getMeetings(limit, true);
}

export function getMeeting(id: string): Meeting | undefined {
  return db.meetings.find(m => m.id === id);
}

export function getMetricsByMeeting(meetingId: string): WebRtcMetrics[] {
  return db.metrics
    .filter(m => m.participantId !== undefined && true)
    .filter(m => {
      const anyMetrics = m as any;
      return anyMetrics.meetingId === meetingId;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getParticipantMetrics(meetingId: string, participantId: string): WebRtcMetrics[] {
  return db.metrics
    .filter(m => (m as any).meetingId === meetingId && m.participantId === participantId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function shutdown() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving database:', e);
  }
}

export default null;
