import { DocumentSymbol, FormattingOptions, Position, Range, SymbolKind, TextDocument } from 'vscode-languageserver';

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
	readonly doc: TextDocument;
	readonly docLastPos: Position;
	startIndex: number;
	lastIndex: number;
	symbols: ParsedSymbol[];
	openedSymbols: ParsedSymbol[];
}
/**
 * Represents kinds of parsed symbol (alias)
 */
export type ParsedSymbolKind = { readonly icon?: SymbolKind; };
export const ParsedSymbolKind = {
	All: {},
	None: {},
	Module: { icon: SymbolKind.Module },
	Procedure: { icon: SymbolKind.Function },
	Macro: { icon: SymbolKind.Function },
	Interface: { icon: SymbolKind.Interface },
	Structure: { icon: SymbolKind.Struct },
	Enumeration: { icon: SymbolKind.Enum },
	Import: { icon: SymbolKind.Package },
	Closing: {},
};
/**
 * Represents parsed symbol rules
 */
export interface ParsedSymbolRule {
	readonly startKeyword: RegExp;
	readonly kind: ParsedSymbolKind;
	readonly endKeyword?: RegExp;
}
/**
 * Represents parsed symbol signature info
 */
export interface ParsedSymbolSignature {
	readonly name: string;
	readonly returnType: string;
	readonly range: Range;
	readonly nameRange: Range;
	readonly selectionRange: Range;
}
/**
 * Represents parsed symbol (with nested symbols)
 */
export class ParsedSymbol extends DocumentSymbol {
	nameRange?: Range;
	rule: ParsedSymbolRule;
	isRootSymbol: boolean;
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