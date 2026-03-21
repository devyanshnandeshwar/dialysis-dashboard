import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/sessionService';

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await SessionService.createSession(req.body);
    res.status(201).json(session);
  } catch (err: any) {
    if (['Cannot schedule a session in the past', 'Cannot schedule more than 30 days in advance', 'Machine ID is required'].includes(err.message)) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (err.message === 'Patient not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'Patient already has a session scheduled for this date') {
      res.status(409).json({ success: false, error: err.message, existingSessionId: err.existingSessionId });
      return;
    }
    if (err.message === 'Machine already assigned to another session today') {
      res.status(409).json({ error: err.message, machineId: err.machineId });
      return;
    }
    next(err);
  }
};

export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await SessionService.updateSession(req.params.id as string, req.body.status);
    res.json(session);
  } catch (err: any) {
    if (err.message === 'Session not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message.startsWith('Cannot start session')) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const populated = await SessionService.completeSession(req.params.id as string, req.body);
    res.json(populated);
  } catch (err: any) {
    if (err.message === 'Session not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'Cannot complete session — no machine assigned') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const getTodaySessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SessionService.getTodaySessions(req.query.includeCompleted !== 'false');
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const updateNurseNotes = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await SessionService.updateNurseNotes(req.params.id as string, req.body.nurseNotes);
    res.json(session);
  } catch (err: any) {
    if (err.message === 'Session not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const getSessionById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await SessionService.getSessionById(req.params.id as string);
    res.json(session);
  } catch (err: any) {
    if (err.message === 'Session not found') {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const reorderQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await SessionService.reorderQueue(req.params.id as string, req.body.direction);
    res.json(updated);
  } catch (err: any) {
    if (err.message === 'Session not found' || err.message === 'Session not in today schedule') {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err.message === 'Cannot move further in that direction') {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
};

export const getPaginatedSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SessionService.getPaginatedSessions(req.query as any);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
