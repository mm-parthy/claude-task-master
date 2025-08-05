import { jest } from '@jest/globals';
import {
	validateCrossTagMove,
	findCrossTagDependencies,
	getDependentTaskIds,
	validateSubtaskMove,
	canMoveWithDependencies
} from '../../../../../scripts/modules/dependency-manager.js';

describe('Circular Dependency Scenarios', () => {
	describe('Circular Cross-Tag Dependencies', () => {
		const allTasks = {
			backlog: {
				1: { id: 1, title: 'Task 1', dependencies: [2], status: 'pending' },
				2: { id: 2, title: 'Task 2', dependencies: [3], status: 'pending' },
				3: { id: 3, title: 'Task 3', dependencies: [1], status: 'pending' }
			},
			'in-progress': {
				4: { id: 4, title: 'Task 4', dependencies: [], status: 'in-progress' }
			}
		};

		it('should detect circular dependencies across tags', () => {
			// Task 1 depends on 2, 2 depends on 3, 3 depends on 1 (circular)
			const conflicts = findCrossTagDependencies(
				[1],
				'backlog',
				'in-progress',
				allTasks
			);

			expect(conflicts).toHaveLength(3);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 2)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 2 && c.dependencyId === 3)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 3 && c.dependencyId === 1)
			).toBe(true);
		});

		it('should block move with circular dependencies', () => {
			expect(() => {
				validateCrossTagMove(1, 'backlog', 'in-progress', allTasks);
			}).toThrow('cross-tag dependency conflicts');
		});

		it('should return canMove: false for circular dependencies', () => {
			const result = canMoveWithDependencies(
				1,
				'backlog',
				'in-progress',
				allTasks
			);
			expect(result.canMove).toBe(false);
			expect(result.conflicts).toHaveLength(3);
		});
	});

	describe('Complex Dependency Chains', () => {
		const allTasks = {
			backlog: {
				1: { id: 1, title: 'Task 1', dependencies: [2, 3], status: 'pending' },
				2: { id: 2, title: 'Task 2', dependencies: [4], status: 'pending' },
				3: { id: 3, title: 'Task 3', dependencies: [5], status: 'pending' },
				4: { id: 4, title: 'Task 4', dependencies: [], status: 'pending' },
				5: { id: 5, title: 'Task 5', dependencies: [6], status: 'pending' },
				6: { id: 6, title: 'Task 6', dependencies: [], status: 'pending' }
			},
			'in-progress': {
				7: { id: 7, title: 'Task 7', dependencies: [], status: 'in-progress' }
			}
		};

		it('should find all dependencies in complex chain', () => {
			const conflicts = findCrossTagDependencies(
				[1],
				'backlog',
				'in-progress',
				allTasks
			);

			// Task 1 depends on 2,3; 2 depends on 4; 3 depends on 5; 5 depends on 6
			expect(conflicts).toHaveLength(4);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 2)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 3)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 2 && c.dependencyId === 4)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 3 && c.dependencyId === 5)
			).toBe(true);
		});

		it('should get all dependent task IDs in complex chain', () => {
			const conflicts = findCrossTagDependencies(
				[1],
				'backlog',
				'in-progress',
				allTasks
			);
			const dependentIds = getDependentTaskIds([1], conflicts, allTasks);

			// Should include all tasks in the dependency chain: 1, 2, 3, 4, 5, 6
			expect(dependentIds).toContain(1);
			expect(dependentIds).toContain(2);
			expect(dependentIds).toContain(3);
			expect(dependentIds).toContain(4);
			expect(dependentIds).toContain(5);
			expect(dependentIds).toContain(6);
		});
	});

	describe('Mixed Dependency Types', () => {
		const allTasks = {
			backlog: {
				1: {
					id: 1,
					title: 'Task 1',
					dependencies: [2, '3.1'],
					status: 'pending'
				},
				2: { id: 2, title: 'Task 2', dependencies: [], status: 'pending' },
				3: { id: 3, title: 'Task 3', dependencies: [], status: 'pending' },
				3.1: {
					id: '3.1',
					title: 'Subtask 3.1',
					dependencies: [],
					status: 'pending'
				}
			},
			'in-progress': {
				4: { id: 4, title: 'Task 4', dependencies: [], status: 'in-progress' }
			}
		};

		it('should handle mixed task and subtask dependencies', () => {
			const conflicts = findCrossTagDependencies(
				[1],
				'backlog',
				'in-progress',
				allTasks
			);

			expect(conflicts).toHaveLength(2);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 2)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === '3.1')
			).toBe(true);
		});

		it('should validate subtask movement restrictions', () => {
			expect(() => {
				validateSubtaskMove('3.1', 'backlog', 'in-progress', allTasks);
			}).toThrow('Cannot move subtask');
		});
	});

	describe('Large Task Set Performance', () => {
		it('should handle large task sets efficiently', () => {
			// Create a large task set with 100 tasks
			const allTasks = {
				backlog: {},
				'in-progress': {}
			};

			// Add 50 tasks to backlog with dependencies
			for (let i = 1; i <= 50; i++) {
				allTasks.backlog[i] = {
					id: i,
					title: `Task ${i}`,
					dependencies: i > 1 ? [i - 1] : [],
					status: 'pending'
				};
			}

			// Add 50 tasks to in-progress
			for (let i = 51; i <= 100; i++) {
				allTasks['in-progress'][i] = {
					id: i,
					title: `Task ${i}`,
					dependencies: [],
					status: 'in-progress'
				};
			}

			// Test performance with large dependency chain
			const startTime = Date.now();
			const conflicts = findCrossTagDependencies(
				[50],
				'backlog',
				'in-progress',
				allTasks
			);
			const endTime = Date.now();

			// Should complete within reasonable time (less than 500ms for unit test)
			expect(endTime - startTime).toBeLessThan(500);

			// Should find all dependencies in the chain
			expect(conflicts.length).toBeGreaterThan(0);
		});
	});

	describe('Edge Cases and Error Conditions', () => {
		it('should handle empty task arrays', () => {
			const allTasks = {
				backlog: {},
				'in-progress': {}
			};

			const conflicts = findCrossTagDependencies(
				[],
				'backlog',
				'in-progress',
				allTasks
			);
			expect(conflicts).toEqual([]);
		});

		it('should handle non-existent tasks gracefully', () => {
			const allTasks = {
				backlog: {
					1: { id: 1, title: 'Task 1', dependencies: [], status: 'pending' }
				},
				'in-progress': {}
			};

			expect(() => {
				findCrossTagDependencies([999], 'backlog', 'in-progress', allTasks);
			}).toThrow('Task 999 not found');
		});

		it('should handle invalid tag names', () => {
			const allTasks = {
				backlog: {
					1: { id: 1, title: 'Task 1', dependencies: [], status: 'pending' }
				}
			};

			expect(() => {
				findCrossTagDependencies([1], 'invalid-tag', 'in-progress', allTasks);
			}).toThrow('Source tag "invalid-tag" not found');
		});

		it('should handle null/undefined dependencies', () => {
			const allTasks = {
				backlog: {
					1: { id: 1, title: 'Task 1', dependencies: null, status: 'pending' },
					2: {
						id: 2,
						title: 'Task 2',
						dependencies: undefined,
						status: 'pending'
					}
				},
				'in-progress': {}
			};

			// Should handle gracefully without throwing
			expect(() => {
				findCrossTagDependencies([1, 2], 'backlog', 'in-progress', allTasks);
			}).not.toThrow();
		});

		it('should handle string dependencies correctly', () => {
			const allTasks = {
				backlog: {
					1: {
						id: 1,
						title: 'Task 1',
						dependencies: ['2', '3'],
						status: 'pending'
					},
					2: { id: 2, title: 'Task 2', dependencies: [], status: 'pending' },
					3: { id: 3, title: 'Task 3', dependencies: [], status: 'pending' }
				},
				'in-progress': {}
			};

			const conflicts = findCrossTagDependencies(
				[1],
				'backlog',
				'in-progress',
				allTasks
			);
			expect(conflicts).toHaveLength(2);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 2)
			).toBe(true);
			expect(
				conflicts.some((c) => c.taskId === 1 && c.dependencyId === 3)
			).toBe(true);
		});
	});
});
