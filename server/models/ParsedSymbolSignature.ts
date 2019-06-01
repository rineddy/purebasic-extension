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


