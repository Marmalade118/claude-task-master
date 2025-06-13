/**
 * add-tag.js
 * Direct function implementation for creating a new tag
 */

import { createTag } from '../../../../scripts/modules/task-manager/tag-management.js';
import {
	enableSilentMode,
	disableSilentMode
} from '../../../../scripts/modules/utils.js';
import { createLogWrapper } from '../../tools/utils.js';

/**
 * Direct function wrapper for creating a new tag with error handling.
 *
 * @param {Object} args - Command arguments
 * @param {string} args.name - Name of the new tag to create
 * @param {boolean} [args.copyFromCurrent=false] - Whether to copy tasks from current tag
 * @param {string} [args.copyFromTag] - Specific tag to copy tasks from
 * @param {string} [args.description] - Optional description for the tag
 * @param {string} [args.tasksJsonPath] - Path to the tasks.json file (resolved by tool)
 * @param {string} [args.projectRoot] - Project root path
 * @param {Object} log - Logger object
 * @param {Object} context - Additional context (session)
 * @returns {Promise<Object>} - Result object { success: boolean, data?: any, error?: { code: string, message: string } }
 */
export async function addTagDirect(args, log, context = {}) {
	// Destructure expected args
	const {
		tasksJsonPath,
		name,
		copyFromCurrent = false,
		copyFromTag,
		description,
		projectRoot
	} = args;
	const { session } = context;

	// Enable silent mode to prevent console logs from interfering with JSON response
	enableSilentMode();

	// Create logger wrapper using the utility
	const mcpLog = createLogWrapper(log);

	try {
		// Check if tasksJsonPath was provided
		if (!tasksJsonPath) {
			log.error('addTagDirect called without tasksJsonPath');
			disableSilentMode();
			return {
				success: false,
				error: {
					code: 'MISSING_ARGUMENT',
					message: 'tasksJsonPath is required'
				}
			};
		}

		// Check required parameters
		if (!name || typeof name !== 'string') {
			log.error('Missing required parameter: name');
			disableSilentMode();
			return {
				success: false,
				error: {
					code: 'MISSING_PARAMETER',
					message: 'Tag name is required and must be a string'
				}
			};
		}

		log.info(`Creating new tag: ${name}`);

		// Prepare options
		const options = {
			copyFromCurrent,
			copyFromTag,
			description
		};

		// Call the createTag function
		const result = await createTag(
			tasksJsonPath,
			name,
			options,
			{
				session,
				mcpLog,
				projectRoot
			},
			'json' // outputFormat - use 'json' to suppress CLI UI
		);

		// Restore normal logging
		disableSilentMode();

		return {
			success: true,
			data: {
				tagName: result.tagName,
				created: result.created,
				tasksCopied: result.tasksCopied,
				sourceTag: result.sourceTag,
				description: result.description,
				message: `Successfully created tag "${result.tagName}"`
			}
		};
	} catch (error) {
		// Make sure to restore normal logging even if there's an error
		disableSilentMode();

		log.error(`Error in addTagDirect: ${error.message}`);
		return {
			success: false,
			error: {
				code: error.code || 'ADD_TAG_ERROR',
				message: error.message
			}
		};
	}
}
