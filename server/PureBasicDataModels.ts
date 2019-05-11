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
	indents: string;
	content: string;
	words: string[];
	strings: string[];
	comment: string;
	endSpaces: string;
	isBlank: boolean;
}
/**
 * Represents read line
 */
export interface ICustomReadLine {
	lineText: string;
	lineRange: Range;
	lineCutText?: string;
	lineCutRange?: Range;
}
/**
 * Represents regex replacer
 * @example let replacer: ICustomRegexReplacer = { /\s(\w+)/g, '$1' }
 */
export interface ICustomRegexReplacer {
	0: RegExp;
	1: string;
}