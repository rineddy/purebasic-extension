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
export type SymbolType = { readonly icon?: SymbolKind; };
export const SymbolType = {
	Unknown: {},
	Module: { icon: SymbolKind.Module },
	Procedure: { icon: SymbolKind.Function },
	Macro: { icon: SymbolKind.Function },
	Interface: { icon: SymbolKind.Interface },
	Structure: { icon: SymbolKind.Struct },
	Enum: { icon: SymbolKind.Enum },
	EnumMember: { icon: SymbolKind.EnumMember },
	Constant: { icon: SymbolKind.Constant },
	Import: { icon: SymbolKind.Package },
};
/**
 * Represents parsed symbol rules
 */
export class SymbolParser {
	public readonly type: SymbolType;
	public readonly openToken: RegExp;
	public readonly contentToken?: RegExp;
	public readonly closeToken?: RegExp;
	public readonly parentType?: SymbolType;
	public readonly isClosed: boolean;
	public isClosing: boolean;

	public static Unknown: SymbolParser = <SymbolParser>{ type: SymbolType.Unknown };

	public static Tokens = {
		ReturnTypeName: /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm,
		Name: /(?<beforeName>[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm,
		Path: /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*")/gm,
		ValidName: /^[a-z_]\w*$/i,
		ValidStringName: /^[a-z_]\w*[$]?$/i,
		ValidConstantName: /^#[a-z_]\w*[$]?$/i,
	};

	public constructor(init?: Partial<SymbolParser>) {
		Object.assign(this, init);
		this.isClosed = (this.closeToken === undefined);
	}

	public openWith(word: string, parsedText: ParsedText) {
		this.isClosing = false;
		return this.openToken.test(word) && (!this.parentType || (parsedText.openedSymbols.length > 0 && this.parentType === parsedText.openedSymbols[0].parser.type));
	}

	public closeWith(word: string) {
		this.isClosing = true;
		return this.closeToken && this.closeToken.test(word);
	}
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
	parser: SymbolParser;
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