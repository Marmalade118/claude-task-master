/**
 * Task Master
 * Copyright (c) 2025 Eyal Toledano, Ralph Khreish
 *
 * This software is licensed under the MIT License with Commons Clause.
 * You may use this software for any purpose, including commercial applications,
 * and modify and redistribute it freely, subject to the following restrictions:
 *
 * 1. You may not sell this software or offer it as a service.
 * 2. The origin of this software must not be misrepresented.
 * 3. Altered source versions must be plainly marked as such.
 *
 * For the full license text, see the LICENSE file in the root directory.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import inquirer from 'inquirer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import gradient from 'gradient-string';
import { isSilentMode } from './modules/utils.js';
import { convertAllRulesToBrandRules } from './modules/rule-transformer.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define log levels
const LOG_LEVELS = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
	success: 4
};

// Get log level from environment or default to info
const LOG_LEVEL = process.env.LOG_LEVEL
	? LOG_LEVELS[process.env.LOG_LEVEL.toLowerCase()]
	: LOG_LEVELS.info;

// Create a color gradient for the banner
const coolGradient = gradient(['#00b4d8', '#0077b6', '#03045e']);
const warmGradient = gradient(['#fb8b24', '#e36414', '#9a031e']);

// Display a fancy banner
function displayBanner() {
	if (isSilentMode()) return;

	console.clear();
	const bannerText = figlet.textSync('Task Master AI', {
		font: 'Standard',
		horizontalLayout: 'default',
		verticalLayout: 'default'
	});

	console.log(coolGradient(bannerText));

	// Add creator credit line below the banner
	console.log(
		chalk.dim('by ') + chalk.cyan.underline('https://x.com/eyaltoledano')
	);

	console.log(
		boxen(chalk.white(`${chalk.bold('Initializing')} your new project`), {
			padding: 1,
			margin: { top: 0, bottom: 1 },
			borderStyle: 'round',
			borderColor: 'cyan'
		})
	);
}

// Logging function with icons and colors
function log(level, ...args) {
	const icons = {
		debug: chalk.gray('🔍'),
		info: chalk.blue('ℹ️'),
		warn: chalk.yellow('⚠️'),
		error: chalk.red('❌'),
		success: chalk.green('✅')
	};

	if (LOG_LEVELS[level] >= LOG_LEVEL) {
		const icon = icons[level] || '';

		// Only output to console if not in silent mode
		if (!isSilentMode()) {
			if (level === 'error') {
				console.error(icon, chalk.red(...args));
			} else if (level === 'warn') {
				console.warn(icon, chalk.yellow(...args));
			} else if (level === 'success') {
				console.log(icon, chalk.green(...args));
			} else if (level === 'info') {
				console.log(icon, chalk.blue(...args));
			} else {
				console.log(icon, ...args);
			}
		}
	}

	// Write to debug log if DEBUG=true
	if (process.env.DEBUG === 'true') {
		const logMessage = `[${level.toUpperCase()}] ${args.join(' ')}\n`;
		fs.appendFileSync('init-debug.log', logMessage);
	}
}

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
		log('info', `Created directory: ${dirPath}`);
	}
}

// Function to add shell aliases to the user's shell configuration
function addShellAliases() {
	const homeDir = process.env.HOME || process.env.USERPROFILE;
	let shellConfigFile;

	// Determine which shell config file to use
	if (process.env.SHELL?.includes('zsh')) {
		shellConfigFile = path.join(homeDir, '.zshrc');
	} else if (process.env.SHELL?.includes('bash')) {
		shellConfigFile = path.join(homeDir, '.bashrc');
	} else {
		log('warn', 'Could not determine shell type. Aliases not added.');
		return false;
	}

	try {
		// Check if file exists
		if (!fs.existsSync(shellConfigFile)) {
			log(
				'warn',
				`Shell config file ${shellConfigFile} not found. Aliases not added.`
			);
			return false;
		}

		// Check if aliases already exist
		const configContent = fs.readFileSync(shellConfigFile, 'utf8');
		if (configContent.includes("alias tm='task-master'")) {
			log('info', 'Task Master aliases already exist in shell config.');
			return true;
		}

		// Add aliases to the shell config file
		const aliasBlock = `
# Task Master aliases added on ${new Date().toLocaleDateString()}
alias tm='task-master'
alias taskmaster='task-master'
`;

		fs.appendFileSync(shellConfigFile, aliasBlock);
		log('success', `Added Task Master aliases to ${shellConfigFile}`);
		log(
			'info',
			'To use the aliases in your current terminal, run: source ' +
				shellConfigFile
		);

		return true;
	} catch (error) {
		log('error', `Failed to add aliases: ${error.message}`);
		return false;
	}
}

// Function to copy a file from the package to the target directory
function copyTemplateFile(templateName, targetPath, replacements = {}) {
	// Get the file content from the appropriate source directory
	let sourcePath;

	// Map template names to their actual source paths
	switch (templateName) {
		// case 'scripts_README.md':
		// 	sourcePath = path.join(__dirname, '..', 'assets', 'scripts_README.md');
		// 	break;
		case 'dev_workflow.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'.cursor',
				'rules',
				'dev_workflow.mdc'
			);
			break;
		case 'taskmaster.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'.cursor',
				'rules',
				'taskmaster.mdc'
			);
			break;
		case 'cursor_rules.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'.cursor',
				'rules',
				'cursor_rules.mdc'
			);
			break;
		case 'self_improve.mdc':
			sourcePath = path.join(
				__dirname,
				'..',
				'.cursor',
				'rules',
				'self_improve.mdc'
			);
			break;
		// case 'README-task-master.md':
		// 	sourcePath = path.join(__dirname, '..', 'README-task-master.md');
		// break;

		default:
			// For other files like env.example, gitignore, etc. that don't have direct equivalents
			sourcePath = path.join(__dirname, '..', 'assets', templateName);
	}

	// Check if the source file exists
	if (!fs.existsSync(sourcePath)) {
		// Fall back to templates directory for files that might not have been moved yet
		sourcePath = path.join(__dirname, '..', 'assets', templateName);
		if (!fs.existsSync(sourcePath)) {
			log('error', `Source file not found: ${sourcePath}`);
			return;
		}
	}

	let content = fs.readFileSync(sourcePath, 'utf8');

	// Replace placeholders with actual values
	Object.entries(replacements).forEach(([key, value]) => {
		const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
		content = content.replace(regex, value);
	});

	// Handle special files that should be merged instead of overwritten
	if (fs.existsSync(targetPath)) {
		const filename = path.basename(targetPath);

		// Handle .gitignore - append lines that don't exist
		if (filename === '.gitignore') {
			log('info', `${targetPath} already exists, merging content...`);
			const existingContent = fs.readFileSync(targetPath, 'utf8');
			const existingLines = new Set(
				existingContent.split('\n').map((line) => line.trim())
			);
			const newLines = content
				.split('\n')
				.filter((line) => !existingLines.has(line.trim()));

			if (newLines.length > 0) {
				// Add a comment to separate the original content from our additions
				const updatedContent =
					existingContent.trim() +
					'\n\n# Added by Claude Task Master\n' +
					newLines.join('\n');
				fs.writeFileSync(targetPath, updatedContent);
				log('success', `Updated ${targetPath} with additional entries`);
			} else {
				log('info', `No new content to add to ${targetPath}`);
			}
			return;
		}

		// Handle README.md - offer to preserve or create a different file
		if (filename === 'README-task-master.md') {
			log('info', `${targetPath} already exists`);
			// Create a separate README file specifically for this project
			const taskMasterReadmePath = path.join(
				path.dirname(targetPath),
				'README-task-master.md'
			);
			fs.writeFileSync(taskMasterReadmePath, content);
			log(
				'success',
				`Created ${taskMasterReadmePath} (preserved original README-task-master.md)`
			);
			return;
		}

		// For other files, warn and prompt before overwriting
		log('warn', `${targetPath} already exists, skipping.`);
		return;
	}

	// If the file doesn't exist, create it normally
	fs.writeFileSync(targetPath, content);
	log('info', `Created file: ${targetPath}`);
}

// Main function to initialize a new project (No longer needs isInteractive logic)
async function initializeProject(options = {}) {
	// Receives options as argument
	// Only display banner if not in silent mode
	if (!isSilentMode()) {
		displayBanner();
	}

	// Debug logging only if not in silent mode
	// if (!isSilentMode()) {
	// 	console.log('===== DEBUG: INITIALIZE PROJECT OPTIONS RECEIVED =====');
	// 	console.log('Full options object:', JSON.stringify(options));
	// 	console.log('options.yes:', options.yes);
	// 	console.log('==================================================');
	// }

	const skipPrompts = options.yes || (options.name && options.description);
	let selectedBrandRules =
		options.rules && Array.isArray(options.rules) && options.rules.length > 0
			? options.rules
			: ['cursor'];

	// if (!isSilentMode()) {
	// 	console.log('Skip prompts determined:', skipPrompts);
	// }

	if (skipPrompts) {
		// Use selectedBrandRules from options or default

		if (!isSilentMode()) {
			console.log('SKIPPING PROMPTS - Using defaults or provided values');
		}

		// Use provided options or defaults
		const projectName = options.name || 'task-master-project';
		const projectDescription =
			options.description || 'A project managed with Task Master AI';
		const projectVersion = options.version || '0.1.0';
		const authorName = options.author || 'Vibe coder';
		const dryRun = options.dryRun || false;
		const addAliases = options.aliases || false;

		if (dryRun) {
			log('info', 'DRY RUN MODE: No files will be modified');
			log('info', 'Would initialize Task Master project');
			log('info', 'Would create/update necessary project files');
			if (addAliases) {
				log('info', 'Would add shell aliases for task-master');
			}
			return {
				dryRun: true
			};
		}

		try {
			createProjectStructure(addAliases, dryRun, selectedBrandRules);
		} catch (error) {
			log('error', `Error during initialization process: ${error.message}`);
			process.exit(1);
		}
	} else {
		// Interactive logic
		log('info', 'Required options not provided, proceeding with prompts.');

		try {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});
			// Only prompt for shell aliases
			const addAliasesInput = await promptQuestion(
				rl,
				chalk.cyan(
					'Add shell aliases for task-master? This lets you type "tm" instead of "task-master" (Y/n): '
				)
			);
			const addAliasesPrompted = addAliasesInput.trim().toLowerCase() !== 'n';

			// Confirm settings...
			console.log('\nTask Master Project settings:');
			console.log(
				chalk.blue(
					'Add shell aliases (so you can use "tm" instead of "task-master"):'
				),
				chalk.white(addAliasesPrompted ? 'Yes' : 'No')
			);

			const confirmInput = await promptQuestion(
				rl,
				chalk.yellow('\nDo you want to continue with these settings? (Y/n): ')
			);
			const shouldContinue = confirmInput.trim().toLowerCase() !== 'n';
			rl.close();

			if (!shouldContinue) {
				log('info', 'Project initialization cancelled by user');
				process.exit(0);
				return;
			}

			// === Brand Rules Selection (Inquirer) ===
			console.log(
				chalk.cyan(
					'\nRules help enforce best practices and conventions for Task Master.'
				)
			);
			const brandRulesQuestion = {
				type: 'checkbox',
				name: 'brandRules',
				message: 'Which IDEs would you like rules included for?',
				choices: availableBrandRules,
				default: ['cursor'],
				validate: (input) => input.length > 0 || 'You must select at least one.'
			};
			const { brandRules } = await inquirer.prompt([brandRulesQuestion]);
			selectedBrandRules = brandRules;

			const dryRun = options.dryRun || false;

			if (dryRun) {
				log('info', 'DRY RUN MODE: No files will be modified');
				log('info', 'Would initialize Task Master project');
				log('info', 'Would create/update necessary project files');
				if (addAliasesPrompted) {
					log('info', 'Would add shell aliases for task-master');
				}
				return {
					dryRun: true
				};
			}

			// Create structure using only necessary values
			createProjectStructure(addAliasesPrompted, dryRun, selectedBrandRules);

			// If in MCP mode, call MCP server for rules (without 'yes' param)
			if (options.mcpMode && options.mcpServer) {
				const mcpArgs = {
					action: 'add',
					rules: selectedBrandRules,
					projectRoot: targetDir
				};
				try {
					const mcpResult = await options.mcpServer.call('rules', mcpArgs);
					if (mcpResult && mcpResult.success) {
						log(
							'success',
							`Brand rules added via MCP: ${selectedBrandRules.join(', ')}`
						);
					} else {
						log(
							'error',
							`MCP rules add failed: ${mcpResult?.error?.message || 'Unknown error'}`
						);
					}
				} catch (err) {
					log('error', `MCP server error: ${err.message}`);
				}
			}

			for (const rule of selectedBrandRules) {
				const profile = BRAND_PROFILES[rule];
				if (profile) {
					convertAllRulesToBrandRules(targetDir, profile);
					// Ensure MCP config is set up under the correct brand folder
					if (rule === 'windsurf' || rule === 'roo') {
					}
				} else {
					log('warn', `Unknown rules profile: ${rule}`);
				}
			}
			// fallback for safety if selectedBrandRules is not an array
			if (!Array.isArray(selectedBrandRules)) {
				convertAllRulesToBrandRules(targetDir, BRAND_PROFILES['cursor']);
			}
		} catch (error) {
			rl.close();
			log('error', `Error during initialization process: ${error.message}`);
			process.exit(1);
		}
	}
}

// Helper function to promisify readline question
function promptQuestion(rl, question) {
	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			resolve(answer);
		});
	});
}

// Function to create the project structure
function createProjectStructure(
	addAliases,
	dryRun,
	selectedBrandRules = ['cursor']
) {
	const targetDir = process.cwd();
	log('info', `Initializing project in ${targetDir}`);

	// Create directories
	ensureDirectoryExists(path.join(targetDir, '.cursor', 'rules'));
	ensureDirectoryExists(path.join(targetDir, 'scripts'));
	ensureDirectoryExists(path.join(targetDir, 'tasks'));

	// Copy template files with replacements
	const replacements = {
		year: new Date().getFullYear()
	};

	// Copy .env.example
	copyTemplateFile(
		'env.example',
		path.join(targetDir, '.env.example'),
		replacements
	);

	// Copy .taskmasterconfig with project name
	copyTemplateFile(
		'.taskmasterconfig',
		path.join(targetDir, '.taskmasterconfig'),
		{
			...replacements
		}
	);

	// Copy .gitignore
	copyTemplateFile('gitignore', path.join(targetDir, '.gitignore'));

	// Copy dev_workflow.mdc
	copyTemplateFile(
		'dev_workflow.mdc',
		path.join(targetDir, '.cursor', 'rules', 'dev_workflow.mdc')
	);

	// Copy taskmaster.mdc
	copyTemplateFile(
		'taskmaster.mdc',
		path.join(targetDir, '.cursor', 'rules', 'taskmaster.mdc')
	);

	// Copy cursor_rules.mdc
	copyTemplateFile(
		'cursor_rules.mdc',
		path.join(targetDir, '.cursor', 'rules', 'cursor_rules.mdc')
	);

	// Copy self_improve.mdc
	copyTemplateFile(
		'self_improve.mdc',
		path.join(targetDir, '.cursor', 'rules', 'self_improve.mdc')
	);

	// Copy example_prd.txt
	copyTemplateFile(
		'example_prd.txt',
		path.join(targetDir, 'scripts', 'example_prd.txt')
	);

	// // Create main README.md
	// copyTemplateFile(
	// 	'README-task-master.md',
	// 	path.join(targetDir, 'README-task-master.md'),
	// 	replacements
	// );

	// Initialize git repository if git is available
	try {
		if (!fs.existsSync(path.join(targetDir, '.git'))) {
			log('info', 'Initializing git repository...');
			execSync('git init', { stdio: 'ignore' });
			log('success', 'Git repository initialized');
		}
	} catch (error) {
		log('warn', 'Git not available, skipping repository initialization');
	}

	// === Generate Brand Rules from assets/rules ===
	log('info', 'Generating brand rules from assets/rules...');
	if (Array.isArray(selectedBrandRules)) {
		for (const rule of selectedBrandRules) {
			const profile = BRAND_PROFILES[rule];
			if (profile) {
				convertAllRulesToBrandRules(targetDir, profile);
				// Ensure MCP config is set up under the correct brand folder for any non-cursor rule
				if (rule !== 'cursor') {
					setupMCPConfiguration(path.join(targetDir, `.${rule}`));
				}
			} else {
				log('warn', `Unknown rules profile: ${rule}`);
			}
		}
	} else {
		// fallback for safety
		convertAllRulesToBrandRules(targetDir, BRAND_PROFILES['cursor']);
	}

	// Run npm install automatically
	const npmInstallOptions = {
		cwd: targetDir,
		// Default to inherit for interactive CLI, change if silent
		stdio: 'inherit'
	};

	if (isSilentMode()) {
		// If silent (MCP mode), suppress npm install output
		npmInstallOptions.stdio = 'ignore';
		log('info', 'Running npm install silently...'); // Log our own message
	} else {
		// Interactive mode, show the boxen message
		console.log(
			boxen(chalk.cyan('Installing dependencies...'), {
				padding: 0.5,
				margin: 0.5,
				borderStyle: 'round',
				borderColor: 'blue'
			})
		);
	}

	// === Add Model Configuration Step ===
	if (!isSilentMode() && !dryRun) {
		console.log(
			boxen(chalk.cyan('Configuring AI Models...'), {
				padding: 0.5,
				margin: { top: 1, bottom: 0.5 },
				borderStyle: 'round',
				borderColor: 'blue'
			})
		);
		log(
			'info',
			'Running interactive model setup. Please select your preferred AI models.'
		);
		try {
			execSync('npx task-master models --setup', {
				stdio: 'inherit',
				cwd: targetDir
			});
			log('success', 'AI Models configured.');
		} catch (error) {
			log('error', 'Failed to configure AI models:', error.message);
			log('warn', 'You may need to run "task-master models --setup" manually.');
		}
	} else if (isSilentMode() && !dryRun) {
		log('info', 'Skipping interactive model setup in silent (MCP) mode.');
		log(
			'warn',
			'Please configure AI models using "task-master models --set-..." or the "models" MCP tool.'
		);
	} else if (dryRun) {
		log('info', 'DRY RUN: Skipping interactive model setup.');
	}
	// ====================================

	// Display success message
	if (!isSilentMode()) {
		console.log(
			boxen(
				warmGradient.multiline(
					figlet.textSync('Success!', { font: 'Standard' })
				) +
					'\n' +
					chalk.green('Project initialized successfully!'),
				{
					padding: 1,
					margin: 1,
					borderStyle: 'double',
					borderColor: 'green'
				}
			)
		);
	}

	// Display next steps in a nice box
	if (!isSilentMode()) {
		console.log(
			boxen(
				chalk.cyan.bold('Things you should do next:') +
					'\n\n' +
					chalk.white('1. ') +
					chalk.yellow(
						'Configure AI models (if needed) and add API keys to `.env`'
					) +
					'\n' +
					chalk.white('   ├─ ') +
					chalk.dim('Models: Use `task-master models` commands') +
					'\n' +
					chalk.white('   └─ ') +
					chalk.dim(
						'Keys: Add provider API keys to .env (or inside the MCP config file i.e. .cursor/mcp.json)'
					) +
					'\n' +
					chalk.white('2. ') +
					chalk.yellow(
						'Discuss your idea with AI and ask for a PRD using example_prd.txt, and save it to scripts/PRD.txt'
					) +
					'\n' +
					chalk.white('3. ') +
					chalk.yellow(
						'Ask Cursor Agent (or run CLI) to parse your PRD and generate initial tasks:'
					) +
					'\n' +
					chalk.white('   └─ ') +
					chalk.dim('MCP Tool: ') +
					chalk.cyan('parse_prd') +
					chalk.dim(' | CLI: ') +
					chalk.cyan('task-master parse-prd scripts/prd.txt') +
					'\n' +
					chalk.white('4. ') +
					chalk.yellow(
						'Ask Cursor to analyze the complexity of the tasks in your PRD using research'
					) +
					'\n' +
					chalk.white('   └─ ') +
					chalk.dim('MCP Tool: ') +
					chalk.cyan('analyze_project_complexity') +
					chalk.dim(' | CLI: ') +
					chalk.cyan('task-master analyze-complexity') +
					'\n' +
					chalk.white('5. ') +
					chalk.yellow(
						'Ask Cursor to expand all of your tasks using the complexity analysis'
					) +
					'\n' +
					chalk.white('6. ') +
					chalk.yellow('Ask Cursor to begin working on the next task') +
					'\n' +
					chalk.white('7. ') +
					chalk.yellow(
						'Ask Cursor to set the status of one or many tasks/subtasks at a time. Use the task id from the task lists.'
					) +
					'\n' +
					chalk.white('8. ') +
					chalk.yellow(
						'Ask Cursor to update all tasks from a specific task id based on new learnings or pivots in your project.'
					) +
					'\n' +
					chalk.white('9. ') +
					chalk.green.bold('Ship it!') +
					'\n\n' +
					chalk.dim(
						'* Review the README.md file to learn how to use other commands via Cursor Agent.'
					) +
					'\n' +
					chalk.dim(
						'* Use the task-master command without arguments to see all available commands.'
					),
				{
					padding: 1,
					margin: 1,
					borderStyle: 'round',
					borderColor: 'yellow',
					title: 'Getting Started',
					titleAlignment: 'center'
				}
			)
		);
	}
}

// Import DRY MCP configuration helper
import { setupMCPConfiguration } from './modules/mcp-utils.js';
// Import centralized brand profile logic
import { BRAND_PROFILES, BRAND_NAMES } from './modules/rule-transformer.js';

// Dynamically generate availableBrandRules from BRAND_NAMES and brand profiles
const availableBrandRules = BRAND_NAMES.map((name) => {
	const displayName =
		BRAND_PROFILES[name]?.brandName ||
		name.charAt(0).toUpperCase() + name.slice(1);
	return {
		name: name === 'cursor' ? `${displayName} (default)` : displayName,
		value: name
	};
});

// Ensure necessary functions are exported
export { initializeProject, log }; // Only export what's needed by commands.js
