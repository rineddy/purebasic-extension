import { DocSymbol } from './DocSymbols';
import { DocSymbolType } from './DocSymbolType';

/**
 * Provides all tokens used to describe symbol
 */
export interface DocSymbolToken extends RegExp { }
export namespace DocSymbolToken {
	export const ReturnTypeName = /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Name = /(?<beforeName>[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Path = /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*"?)/gm;
}
/**
 * Describes how to parse document tokens to detect any type of symbol
 */
export class DocSymbolParser {
	public readonly parentType?: DocSymbolType;
	public readonly type: DocSymbolType;
	public readonly openToken: DocSymbolToken;
	public readonly contentToken?: DocSymbolToken;
	public readonly closeToken?: DocSymbolToken;
	public readonly isClosed: boolean;
	public isClosing: boolean;

	public static Unknown: DocSymbolParser = <DocSymbolParser>{ type: DocSymbolType.Unknown };

	public constructor(init?: Partial<DocSymbolParser>) {
		Object.assign(this, init);
		this.isClosed = (this.closeToken === undefined);
	}

	public openWith(word: string, openedSymbols: DocSymbol[]): boolean {
		this.isClosing = false;
		return this.openToken.test(word) && (!this.parentType || (openedSymbols.length > 0 && this.parentType === openedSymbols[0].type));
	}

	public closeWith(word: string): boolean {
		this.isClosing = true;
		return this.closeToken && this.closeToken.test(word);
	}
}
