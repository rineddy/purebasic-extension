import { ClosureStatus } from '../models/ClosureStatus';
import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocToken } from '../models/DocToken';
import { DocTokenRegex } from '../models/DocTokenRegex';

/**
 * Describes how to parse document tokens to detect any type of symbol
 */
export class DocTokenParser {
	public readonly parentType?: DocSymbolType;
	public readonly type: DocSymbolType;
	public readonly openRegex: DocTokenRegex;
	public readonly contentRegex?: DocTokenRegex;
	public readonly closeRegex?: DocTokenRegex;
	public symbolToken?: DocToken;

	public constructor(init?: Partial<DocTokenParser>) {
		Object.assign(this, init);
	}

	parse(token: DocToken, openedSymbols: DocSymbol[]): boolean {
		this.symbolToken = undefined;
		if (this.openRegex.test(token.groups.name) && (!this.parentType || (openedSymbols.length > 0 && this.parentType === openedSymbols[0].type))) {
			this.symbolToken = token;
			this.symbolToken.type = this.type;
			this.symbolToken.closure = (this.closeRegex === undefined) ? ClosureStatus.Closed : undefined;
		}
		else if (this.closeRegex && this.closeRegex.test(token.groups.name)) {
			this.symbolToken = token;
			this.symbolToken.type = this.type;
			this.symbolToken.closure = ClosureStatus.Closing;
		}
		return this.symbolToken !== undefined;
	}
}
