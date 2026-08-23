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
  } catch (err) {
    next(err);
  }
};

export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await SessionService.updateSession(
      req.params.id as string,
      req.body.status
    );
    res.json(session);
  } catch (err) {
    next(err);
  }
};

export const completeSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const populated = await SessionService.completeSession(
      req.params.id as string,
      req.body
    );
    res.json(populated);
  } catch (err) {
    next(err);
  }
};

export const getTodaySessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SessionService.getTodaySessions(
      req.query.includeCompleted !== 'false'
    );
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
    const session = await SessionService.updateNurseNotes(
      req.params.id as string,
      req.body.nurseNotes
    );
    res.json(session);
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
};

export const reorderQueue = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const updated = await SessionService.reorderQueue(
      req.params.id as string,
      req.body.direction
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const getPaginatedSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = await SessionService.getPaginatedSessions(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
