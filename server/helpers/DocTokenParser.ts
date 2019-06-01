import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocToken } from '../models/DocToken';

/**
 * Token of document symbol. (symbol building block description)
 */
export interface DocSymbolToken extends RegExp { }
export namespace DocSymbolToken {
	export const ReturnTypeName = /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Name = /(?<beforeName>[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Path = /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*"?)/gm;
}
export enum ClosureStatus {
	Closing = 1,
	Closed = 2
}
/**
 * Describes how to parse document tokens to detect any type of symbol
 */
export class DocTokenParser {
	public readonly parentType?: DocSymbolType;
	public readonly type: DocSymbolType;
	public readonly openToken: DocSymbolToken;
	public readonly contentToken?: DocSymbolToken;
	public readonly closeToken?: DocSymbolToken;
	public symbolToken?: DocToken;

	public constructor(init?: Partial<DocTokenParser>) {
		Object.assign(this, init);
	}

	parse(token: DocToken, openedSymbols: DocSymbol[]): boolean {
		this.symbolToken = undefined;
		if (this.openToken.test(token.groups.name) && (!this.parentType || (openedSymbols.length > 0 && this.parentType === openedSymbols[0].type))) {
			this.symbolToken = token;
			this.symbolToken.type = this.type;
			this.symbolToken.closure = (this.closeToken === undefined) ? ClosureStatus.Closed : undefined;
		}
		else if (this.closeToken && this.closeToken.test(token.groups.name)) {
			this.symbolToken = token;
			this.symbolToken.type = this.type;
			this.symbolToken.closure = ClosureStatus.Closing;
		}
		return this.symbolToken !== undefined;
	}
}
