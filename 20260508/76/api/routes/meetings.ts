import { Router } from 'express';
import { getMeetings, getMeeting, getMetricsByMeeting, getParticipantMetrics, getEndedMeetings } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const onlyEnded = req.query.ended !== 'false';
    const meetings = onlyEnded ? getEndedMeetings(50) : getMeetings(50);
    res.json(meetings);
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const meeting = getMeeting(req.params.id);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }
    res.json(meeting);
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

router.get('/:id/metrics', (req, res) => {
  try {
    const meeting = getMeeting(req.params.id);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    const participantId = req.query.participantId as string;
    let metrics;
    
    if (participantId) {
      metrics = getParticipantMetrics(req.params.id, participantId);
    } else {
      metrics = getMetricsByMeeting(req.params.id);
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

export default router;
