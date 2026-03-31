/**
 * Unit tests for Auth Controller
 * Run: npm test
 */
import { Request, Response } from 'express';
import { login } from '../controllers/authController';

// Mock mongoose models and dependencies
jest.mock('../models/User', () => ({
  findOne: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
}));

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Controller', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('login()', () => {
    it('returns 400 if email or password missing', async () => {
      const req = { body: {} } as Request;
      const res = mockResponse();
      await login(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400 })
      );
    });

    it('returns 401 for non-existent user', async () => {
      const User = require('../models/User').default;
      User.findOne.mockResolvedValueOnce(null);

      const req = { body: { email: 'x@x.com', password: 'pass' } } as Request;
      const res = mockResponse();
      await login(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });

    it('returns 401 for inactive user', async () => {
      const User = require('../models/User').default;
      User.findOne.mockResolvedValueOnce({ isActive: false });

      const req = { body: { email: 'x@x.com', password: 'pass' } } as Request;
      const res = mockResponse();
      await login(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401 })
      );
    });
  });
});

describe('Error Handler Utility', () => {
  it('createError creates error with correct statusCode', () => {
    const { createError } = require('../middleware/errorHandler');
    const err = createError('Not found', 404);
    expect(err.message).toBe('Not found');
    expect(err.statusCode).toBe(404);
    expect(err.isOperational).toBe(true);
  });
});

describe('Helper Utilities', () => {
  it('logger is defined', () => {
    const { logger } = require('../utils/logger');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
  });
});
