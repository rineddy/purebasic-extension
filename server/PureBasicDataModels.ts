import { DocumentSymbol, FormattingOptions, Range, SymbolKind, TextDocument } from 'vscode-languageserver';

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
	readonly doc: TextDocument;
	readonly text: string;
	startIndex: number;
	lastIndex: number;
	openedSymbol?: ParsedSymbol;
	symbols: ParsedSymbol[];
	strings: RegexCapture[];
	comments: RegexCapture[];
}
export interface ParsedSymbol_ extends DocumentSymbol {
	startIndex: number;
	lastIndex: number;
	rule: ParsedSymbolRule;
	parent?: ParsedSymbol;
}
export enum ParsedSymbolType {
	All = 0xFF,
	None = 0,
	Module = 1 << 0,
	Procedure = 1 << 1,
	Interface = 1 << 2,
	Structure = 1 << 3,
	Enumeration = 1 << 4,
	Import = 1 << 5,
	Macro = 1 << 6,
}
export interface ParsedSymbolRule {
	type: ParsedSymbolType;
	kind: SymbolKind;
	endKeyword?: String;
}
/**
 * Represents parsed symbol (with nested symbols)
 */
export class ParsedSymbol {
	docSymbol: DocumentSymbol;
	startIndex: number;
	lastIndex: number;
	rule: ParsedSymbolRule;
	parent?: ParsedSymbol;
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