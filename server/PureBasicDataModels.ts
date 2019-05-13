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
	readonly flags?: string;
	readonly before: number;
	readonly after: number;
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
 * Represents parsed line structure (indentation spaces, text content, words, strings, comment)
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
	readonly isBlank: boolean;
	readonly words: string[];
	readonly strings: string[];
	indents: string;
	content: string;
	comment: string;
	endSpaces: string;
}
/**
 * Represents parsed text structure (text, strings, comments)
 */
export interface ParsedText {
	readonly text: string;
	strings: RegexCapture[];
	comments: RegexCapture[];
}
/**
 * Represents regex replacer
 * @example let replacer: RegexReplaceRule = [ /\s(\w+)/g, '$1' ]
 */
export interface RegexReplaceRule {
	0: RegExp;
	1: string;
}
/**
 * Represents regex captured result
 */
export interface RegexCapture {
	readonly text: string;
	readonly startPos: number;
	readonly endPos: number;
}