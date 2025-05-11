/**
 * Rule Transformer Module
 * Handles conversion of Cursor rules to brand rules
 *
 * This module procedurally generates .{brand}/rules files from assets/rules files,
 * eliminating the need to maintain both sets of files manually.
 */
import fs from 'fs';
import path from 'path';
import { log } from './utils.js';

// Import the shared MCP configuration helper
import { setupMCPConfiguration } from './mcp-utils.js';

// --- Centralized Brand Helpers ---
export const BRAND_NAMES = ['cursor', 'roo', 'windsurf'];

import * as cursorProfile from '../profiles/cursor.js';
import * as rooProfile from '../profiles/roo.js';
import * as windsurfProfile from '../profiles/windsurf.js';

export const BRAND_PROFILES = {
	cursor: cursorProfile,
	roo: rooProfile,
	windsurf: windsurfProfile
};

export function isValidBrand(brand) {
	return BRAND_NAMES.includes(brand);
}

export function getBrandProfile(brand) {
	return BRAND_PROFILES[brand];
}

/**
 * Replace basic Cursor terms with brand equivalents
 */
function replaceBasicTerms(content, conversionConfig) {
	let result = content;

	// Apply brand term replacements
	conversionConfig.brandTerms.forEach((pattern) => {
		if (typeof pattern.to === 'function') {
			result = result.replace(pattern.from, pattern.to);
		} else {
			result = result.replace(pattern.from, pattern.to);
		}
	});

	// Apply file extension replacements
	conversionConfig.fileExtensions.forEach((pattern) => {
		result = result.replace(pattern.from, pattern.to);
	});

	return result;
}

/**
 * Replace Cursor tool references with brand tool equivalents
 */
function replaceToolReferences(content, conversionConfig) {
	let result = content;

	// Basic pattern for direct tool name replacements
	const toolNames = conversionConfig.toolNames;
	const toolReferencePattern = new RegExp(
		`\\b(${Object.keys(toolNames).join('|')})\\b`,
		'g'
	);

	// Apply direct tool name replacements
	result = result.replace(toolReferencePattern, (match, toolName) => {
		return toolNames[toolName] || toolName;
	});

	// Apply contextual tool replacements
	conversionConfig.toolContexts.forEach((pattern) => {
		result = result.replace(pattern.from, pattern.to);
	});

	// Apply tool group replacements
	conversionConfig.toolGroups.forEach((pattern) => {
		result = result.replace(pattern.from, pattern.to);
	});

	return result;
}

/**
 * Update documentation URLs to point to brand documentation
 */
function updateDocReferences(content, conversionConfig) {
	let result = content;

	// Apply documentation URL replacements
	conversionConfig.docUrls.forEach((pattern) => {
		if (typeof pattern.to === 'function') {
			result = result.replace(pattern.from, pattern.to);
		} else {
			result = result.replace(pattern.from, pattern.to);
		}
	});

	return result;
}

/**
 * Update file references in markdown links
 */
function updateFileReferences(content, conversionConfig) {
	const { pathPattern, replacement } = conversionConfig.fileReferences;
	return content.replace(pathPattern, replacement);
}

/**
 * Main transformation function that applies all conversions
 */
// Main transformation function that applies all conversions, now brand-generic
function transformCursorToBrandRules(
	content,
	conversionConfig,
	globalReplacements = []
) {
	// Apply all transformations in appropriate order
	let result = content;
	result = replaceBasicTerms(result, conversionConfig);
	result = replaceToolReferences(result, conversionConfig);
	result = updateDocReferences(result, conversionConfig);
	result = updateFileReferences(result, conversionConfig);

	// Apply any global/catch-all replacements from the brand profile
	// Super aggressive failsafe pass to catch any variations we might have missed
	// This ensures critical transformations are applied even in contexts we didn't anticipate
	globalReplacements.forEach((pattern) => {
		if (typeof pattern.to === 'function') {
			result = result.replace(pattern.from, pattern.to);
		} else {
			result = result.replace(pattern.from, pattern.to);
		}
	});

	return result;
}

/**
 * Convert a single Cursor rule file to brand rule format
 */
function convertRuleToBrandRule(sourcePath, targetPath, profile) {
	const { conversionConfig, brandName, globalReplacements } = profile;
	try {
		log(
			'debug',
			`Converting Cursor rule ${path.basename(sourcePath)} to ${brandName} rule ${path.basename(targetPath)}`
		);

		// Read source content
		const content = fs.readFileSync(sourcePath, 'utf8');

		// Transform content
		const transformedContent = transformCursorToBrandRules(
			content,
			conversionConfig,
			globalReplacements
		);

		// Ensure target directory exists
		const targetDir = path.dirname(targetPath);
		if (!fs.existsSync(targetDir)) {
			fs.mkdirSync(targetDir, { recursive: true });
		}

		// Write transformed content
		fs.writeFileSync(targetPath, transformedContent);
		log(
			'debug',
			`Successfully converted ${path.basename(sourcePath)} to ${path.basename(targetPath)}`
		);

		return true;
	} catch (error) {
		log(
			'error',
			`Failed to convert rule file ${path.basename(sourcePath)}: ${error.message}`
		);
		return false;
	}
}

/**
 * Process all Cursor rules and convert to brand rules
 */
function convertAllRulesToBrandRules(projectDir, profile) {
	const { fileMap, brandName, rulesDir } = profile;
	// Use assets/rules as the source of rules instead of .cursor/rules
	const cursorRulesDir = path.join(projectDir, 'assets', 'rules');
	const brandRulesDir = path.join(projectDir, rulesDir);

	if (!fs.existsSync(cursorRulesDir)) {
		log('warn', `Cursor rules directory not found: ${cursorRulesDir}`);
		return { success: 0, failed: 0 };
	}

	// Ensure brand rules directory exists
	if (!fs.existsSync(brandRulesDir)) {
		fs.mkdirSync(brandRulesDir, { recursive: true });
		log('debug', `Created ${brandName} rules directory: ${brandRulesDir}`);
		// Also create MCP configuration in the brand directory
		const brandDir = path.dirname(brandRulesDir);
		setupMCPConfiguration(brandDir);
	}

	// Count successful and failed conversions
	let success = 0;
	let failed = 0;

	// Process each file in the Cursor rules directory
	fs.readdirSync(cursorRulesDir).forEach((file) => {
		if (file.endsWith('.mdc')) {
			const sourcePath = path.join(cursorRulesDir, file);

			// Determine target file name
			let targetFilename;
			if (fileMap[file]) { // If an explicit mapping exists, use it
				targetFilename = fileMap[file];
			} else if (brandName === 'Roo' || brandName === 'Windsurf') {
				// For Roo and Windsurf, change .mdc to .md if not in fileMap
				targetFilename = file.replace(/\.mdc$/, '.md');
			} else {
				// For Cursor (and potentially others), keep original if not in fileMap
				targetFilename = file;
			}
			const targetPath = path.join(brandRulesDir, targetFilename);

			// Convert the file
			if (convertRuleToBrandRule(sourcePath, targetPath, profile)) {
				success++;
			} else {
				failed++;
			}
		}
	});

	log(
		'debug',
		`Rule conversion complete: ${success} successful, ${failed} failed`
	);

	// Call post-processing hook if defined (e.g., for Roo's rules-*mode* folders)
	if (typeof profile.onPostConvertBrandRules === 'function') {
		profile.onPostConvertBrandRules(projectDir);
	}

	return { success, failed };
}

/**
 * Remove a brand's rules directory and, if empty, the parent brand folder (except .cursor)
 * @param {string} projectDir - The root directory of the project
 * @param {object} profile - The brand profile object
 * @returns {boolean} - True if removal succeeded, false otherwise
 */
function removeBrandRules(projectDir, profile) {
	const { brandName, rulesDir } = profile;
	const brandRulesDir = path.join(projectDir, rulesDir);
	const brandDir = path.dirname(brandRulesDir);
	const mcpPath = path.join(brandDir, 'mcp.json');

	const result = {
		brandName,
		mcpConfigRemoved: false,
		rulesDirRemoved: false,
		brandFolderRemoved: false,
		skipped: false,
		error: null,
		success: false // Overall success for this brand
	};

	if (fs.existsSync(mcpPath)) {
		try {
			fs.unlinkSync(mcpPath);
			result.mcpConfigRemoved = true;
		} catch (e) {
			const errorMessage = `Failed to remove MCP configuration at ${mcpPath}: ${e.message}`;
			log('warn', errorMessage);
			result.error = result.error
				? `${result.error}; ${errorMessage}`
				: errorMessage;
		}
	}

	// Remove rules directory
	if (fs.existsSync(brandRulesDir)) {
		try {
			fs.rmSync(brandRulesDir, { recursive: true, force: true });
			result.rulesDirRemoved = true;
		} catch (e) {
			const errorMessage = `Failed to remove rules directory at ${brandRulesDir}: ${e.message}`;
			log('warn', errorMessage);
			result.error = result.error
				? `${result.error}; ${errorMessage}`
				: errorMessage;
		}
	}

	// Remove brand folder if empty
	if (fs.existsSync(brandDir) && fs.readdirSync(brandDir).length === 0) {
		try {
			fs.rmdirSync(brandDir);
			result.brandFolderRemoved = true;
		} catch (e) {
			const errorMessage = `Failed to remove empty brand folder at ${brandDir}: ${e.message}`;
			log('warn', errorMessage);
			result.error = result.error
				? `${result.error}; ${errorMessage}`
				: errorMessage;
		}
	}

	// Call onRemoveBrandRules hook if present
	if (typeof profile.onRemoveBrandRules === 'function') {
		try {
			profile.onRemoveBrandRules(projectDir);
		} catch (e) {
			const errorMessage = `Error in onRemoveBrandRules for ${brandName}: ${e.message}`;
			log('warn', errorMessage);
			result.error = result.error
				? `${result.error}; ${errorMessage}`
				: errorMessage;
		}
	}

	result.success =
		result.mcpConfigRemoved ||
		result.rulesDirRemoved ||
		result.brandFolderRemoved;
	return result;
}

export {
	convertAllRulesToBrandRules,
	convertRuleToBrandRule,
	removeBrandRules
};
