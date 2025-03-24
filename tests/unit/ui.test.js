/**
 * UI module tests
 */

import { jest } from '@jest/globals';
import { 
  getStatusWithColor, 
  formatDependenciesWithStatus, 
  createProgressBar,
  getComplexityWithColor
} from '../../scripts/modules/ui.js';
import { sampleTasks } from '../fixtures/sample-tasks.js';

// Mock dependencies
jest.mock('chalk', () => {
  const origChalkFn = text => text;
  const chalk = origChalkFn;
  chalk.green = text => text; // Return text as-is for status functions
  chalk.yellow = text => text;
  chalk.red = text => text;
  chalk.cyan = text => text;
  chalk.blue = text => text;
  chalk.gray = text => text;
  chalk.white = text => text;
  chalk.bold = text => text;
  chalk.dim = text => text;
  
  // Add hex and other methods
  chalk.hex = () => origChalkFn;
  chalk.rgb = () => origChalkFn;
  
  return chalk;
});

jest.mock('figlet', () => ({
  textSync: jest.fn(() => 'Task Master Banner'),
}));

jest.mock('boxen', () => jest.fn(text => `[boxed: ${text}]`));

jest.mock('ora', () => jest.fn(() => ({
  start: jest.fn(),
  succeed: jest.fn(),
  fail: jest.fn(),
  stop: jest.fn(),
})));

jest.mock('cli-table3', () => jest.fn().mockImplementation(() => ({
  push: jest.fn(),
  toString: jest.fn(() => 'Table Content'),
})));

jest.mock('gradient-string', () => jest.fn(() => jest.fn(text => text)));

jest.mock('../../scripts/modules/utils.js', () => ({
  CONFIG: {
    projectName: 'Test Project',
    projectVersion: '1.0.0',
  },
  log: jest.fn(),
  findTaskById: jest.fn(),
  readJSON: jest.fn(),
  readComplexityReport: jest.fn(),
  truncate: jest.fn(text => text),
}));

jest.mock('../../scripts/modules/task-manager.js', () => ({
  findNextTask: jest.fn(),
  analyzeTaskComplexity: jest.fn(),
}));

describe('UI Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStatusWithColor function', () => {
    test('should return done status in green', () => {
      const result = getStatusWithColor('done');
      expect(result).toMatch(/done/);
      expect(result).toContain('✅');
    });

    test('should return pending status in yellow', () => {
      const result = getStatusWithColor('pending');
      expect(result).toMatch(/pending/);
      expect(result).toContain('⏱️');
    });

    test('should return deferred status in gray', () => {
      const result = getStatusWithColor('deferred');
      expect(result).toMatch(/deferred/);
      expect(result).toContain('⏱️');
    });

    test('should return in-progress status in cyan', () => {
      const result = getStatusWithColor('in-progress');
      expect(result).toMatch(/in-progress/);
      expect(result).toContain('🔄');
    });

    test('should return unknown status in red', () => {
      const result = getStatusWithColor('unknown');
      expect(result).toMatch(/unknown/);
      expect(result).toContain('❌');
    });
  });

  describe('formatDependenciesWithStatus function', () => {
    test('should format dependencies with status indicators', () => {
      const dependencies = [1, 2, 3];
      const allTasks = [
        { id: 1, status: 'done' },
        { id: 2, status: 'pending' },
        { id: 3, status: 'deferred' }
      ];

      const result = formatDependenciesWithStatus(dependencies, allTasks);
      
      expect(result).toBe('✅ 1 (done), ⏱️ 2 (pending), ⏱️ 3 (deferred)');
    });

    test('should return "None" for empty dependencies', () => {
      const result = formatDependenciesWithStatus([], []);
      expect(result).toBe('None');
    });

    test('should handle missing tasks in the task list', () => {
      const dependencies = [1, 999];
      const allTasks = [
        { id: 1, status: 'done' }
      ];

      const result = formatDependenciesWithStatus(dependencies, allTasks);
      expect(result).toBe('✅ 1 (done), 999 (Not found)');
    });
  });

  describe('createProgressBar function', () => {
    test('should create a progress bar with the correct percentage', () => {
      const result = createProgressBar(50, 10);
      expect(result).toBe('█████░░░░░ 50%');
    });

    test('should handle 0% progress', () => {
      const result = createProgressBar(0, 10);
      expect(result).toBe('░░░░░░░░░░ 0%');
    });

    test('should handle 100% progress', () => {
      const result = createProgressBar(100, 10);
      expect(result).toBe('██████████ 100%');
    });

    test('should handle invalid percentages by clamping', () => {
      const result1 = createProgressBar(0, 10); // -10 should clamp to 0
      expect(result1).toBe('░░░░░░░░░░ 0%');
      
      const result2 = createProgressBar(100, 10); // 150 should clamp to 100
      expect(result2).toBe('██████████ 100%');
    });
  });

  describe('getComplexityWithColor function', () => {
    test('should return high complexity in red', () => {
      const result = getComplexityWithColor(8);
      expect(result).toMatch(/8/);
      expect(result).toContain('🔴');
    });

    test('should return medium complexity in yellow', () => {
      const result = getComplexityWithColor(5);
      expect(result).toMatch(/5/);
      expect(result).toContain('🟡');
    });

    test('should return low complexity in green', () => {
      const result = getComplexityWithColor(3);
      expect(result).toMatch(/3/);
      expect(result).toContain('🟢');
    });

    test('should handle non-numeric inputs', () => {
      const result = getComplexityWithColor('high');
      expect(result).toMatch(/high/);
      expect(result).toContain('🔴');
    });
  });
}); 