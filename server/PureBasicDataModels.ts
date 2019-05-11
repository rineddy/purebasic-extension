import { FormattingOptions, Range } from 'vscode-languageserver';

/**
 * Represents Purebasic settings customized by user
 */
export interface ICustomSettings {
	diagnostics: {
		maxNumberOfProblems: number;
	};
	indentationRules: IndentationRule[];
}
/**
 * Represents Purebasic indentation rules
 */
export interface IndentationRule {
	regex: string | RegExp;
	flags?: string;
	before: number;
	after: number;
}
/**
 * Represents custom indenting context for current and next line
 */
export interface IndentationContext {
	current: number;
	next: number;
	readonly options: FormattingOptions;
	readonly indentRules: IndentationRule[];
	readonly oneIndent: string;
	readonly tabSpaces: string;
}
/**
 * Represents line text structure (indentation spaces, text content, words, strings, comment)
 */
export interface ParsedLine {
	newText: string;
	readonly text: string;
	readonly range: Range;
	readonly cut?: {
		newText: string;
		readonly text: string;
		readonly range: Range;
	};
	readonly words: string[];
	readonly strings: string[];
	indents: string;
	content: string;
	comment: string;
	endSpaces: string;
	readonly isBlank: boolean;
}
/**
 * Represents regex replacer
 * @example let replacer: ICustomRegexReplacer = { /\s(\w+)/g, '$1' }
 */
export interface ICustomRegexReplacer {
	0: RegExp;
	1: string;
}