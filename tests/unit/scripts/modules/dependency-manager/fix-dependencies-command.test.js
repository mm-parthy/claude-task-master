// new file

/**
 * Unit test to ensure fixDependenciesCommand writes JSON with the correct
 * projectRoot and tag arguments so that tag data is preserved.
 */

import { jest } from '@jest/globals';

// --- Mock utils.js so we can intercept readJSON / writeJSON calls
const mockWriteJSON = jest.fn();
const mockReadJSON = jest.fn();

jest.mock('../../../../../scripts/modules/utils.js', () => {
	// Import the real module to keep original behaviour for other exports
	const originalModule = jest.requireActual(
		'../../../../../scripts/modules/utils.js'
	);
	return {
		__esModule: true,
		// Spread other real exports
		...originalModule,
		// Override IO helpers
		readJSON: (...args) => mockReadJSON(...args),
		writeJSON: (...args) => mockWriteJSON(...args),
		// Override logger to silence console during tests
		log: jest.fn()
	};
});

// After mocks are in place, import the module under test
import { fixDependenciesCommand } from '../../../../../scripts/modules/dependency-manager.js';

describe('fixDependenciesCommand tag preservation', () => {
	beforeEach(() => {
		jest.clearAllMocks();

		// Mock a minimal tagged tasks structure
		mockReadJSON.mockReturnValue({
			tag: 'master',
			tasks: [{ id: 1, title: 'Example Task', dependencies: [] }],
			_rawTaggedData: {
				master: { tasks: [{ id: 1, title: 'Example Task', dependencies: [] }] },
				'feature-branch': {
					tasks: [{ id: 1, title: 'Feature Task', dependencies: [] }]
				}
			}
		});
	});

	it('calls writeJSON with projectRoot and tag parameters', async () => {
		const tasksPath = '/mock/tasks.json';
		const projectRoot = '/mock/project/root';
		const tag = 'master';

		await fixDependenciesCommand(tasksPath, {
			context: { projectRoot, tag }
		});

		expect(mockWriteJSON).toHaveBeenCalled();

		const [calledPath, _data, calledProjectRoot, calledTag] =
			mockWriteJSON.mock.calls[0];

		expect(calledPath).toBe(tasksPath);
		expect(calledProjectRoot).toBe(projectRoot);
		expect(calledTag).toBe(tag);
	});
});
