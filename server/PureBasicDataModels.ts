import { Range } from 'vscode-languageserver';

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
 * Represents regex replacer
 * @example let replacer: RegexReplaceRule = [ /\s(\w+)/g, '$1' ]
 */
export interface RegexReplaceRule {
	0: RegExp;
	1: string;
}
