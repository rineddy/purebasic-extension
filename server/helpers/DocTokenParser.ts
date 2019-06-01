import { DocumentSymbol, Range } from 'vscode-languageserver';

import { ClosureStatus } from '../models/ClosureStatus';
import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocToken } from '../models/DocToken';
import { DocTokenRegex } from '../models/DocTokenRegex';
import { DocTokenizer } from './DocTokenizer';

/**
 * Describes how to parse document tokens to detect any type of symbol
 */
export class DocTokenParser {
	public readonly openRegex: DocTokenRegex;
	public readonly contentRegex?: DocTokenRegex;
	public readonly closeRegex?: DocTokenRegex;
	public readonly parentType?: DocSymbolType;
	public readonly type: DocSymbolType;

	public constructor(init?: Partial<DocTokenParser>) {
		Object.assign(this, init);
	}

	public parse(token: DocToken, context: { tokenizer: DocTokenizer, symbols: DocSymbol[], openedSymbols: DocSymbol[] }): boolean {
		const { tokenizer, openedSymbols } = context;
		let symbolToken: DocToken;
		if (this.openRegex.test(token.groups.name) && (!this.parentType || (openedSymbols.length > 0 && this.parentType === openedSymbols[0].type))) {
			symbolToken = token;
			symbolToken.type = this.type;
			symbolToken.closure = (this.closeRegex === undefined) ? ClosureStatus.Closed : undefined;
		}
		else if (this.closeRegex && this.closeRegex.test(token.groups.name)) {
			symbolToken = token;
			symbolToken.type = this.type;
			symbolToken.closure = ClosureStatus.Closing;
		}
		if (symbolToken) {
			if (symbolToken.closure === ClosureStatus.Closing) {
				this.closeSymbol(symbolToken, context);
			} else if (symbolToken.closure === ClosureStatus.Closed) {
				this.openSymbol(symbolToken, context);
			} else if (symbolToken.type) {
				for (const token of tokenizer.extendToken(symbolToken, this.contentRegex)) {
					this.openSymbol(token, context);
				}
			}
			return true;
		}
	}
	public openSymbol(token: DocToken, context: { tokenizer: DocTokenizer, symbols: DocSymbol[], openedSymbols: DocSymbol[] }) {
		const { symbols, openedSymbols } = context;
		const { name, range, selectionRange, nameRange } = this.extractSymbolInfo(token, context);
		const docSymbol = DocumentSymbol.create(name, '', token.type.icon, range, selectionRange, []);
		const parsedSymbol = new DocSymbol({
			...docSymbol,
			nameRange: nameRange,
			type: token.type,
		});
		if (openedSymbols.length > 0) {
			openedSymbols[0].children.push(parsedSymbol);
			if (token.closure !== ClosureStatus.Closed) { openedSymbols.unshift(parsedSymbol); }
		} else {
			if (token.closure !== ClosureStatus.Closed) { openedSymbols.unshift(parsedSymbol); }
			parsedSymbol.isRootSymbol = true;
		}
		symbols.push(parsedSymbol);
	}
	public closeSymbol(token: DocToken, context: { tokenizer: DocTokenizer, symbols: DocSymbol[], openedSymbols: DocSymbol[] }) {
		const { tokenizer: { doc }, openedSymbols } = context;
		openedSymbols.some((openedSymbol, id) => {
			if (openedSymbol.type === token.type) {
				openedSymbol.detail = `(closed at ${token.lastIndex})`;
				openedSymbol.range.end = doc.positionAt(token.lastIndex);
				this.alignToClosingSymbol(openedSymbol, context);
				context.openedSymbols = openedSymbols.splice(id + 1);
				return true;
			}
		});
	}
	private alignToClosingSymbol(lastSymbol: DocSymbol, context: { tokenizer: DocTokenizer, symbols: DocSymbol[], openedSymbols: DocSymbol[] }) {
		const { openedSymbols } = context;
		const endPos = lastSymbol.range.end;
		for (const openedSymbol of openedSymbols) {
			if (openedSymbol === lastSymbol) break;
			openedSymbol.range.end = endPos;
		}
	}
	private extractSymbolInfo(token: DocToken, context: { tokenizer: DocTokenizer, symbols: DocSymbol[], openedSymbols: DocSymbol[] }) {
		const { tokenizer: { doc, docLastPos, startIndex } } = context;
		const { groups, index, lastIndex, closure } = token;
		const name = groups.name;
		const returnType = groups.returnType;
		const startPos = doc.positionAt(startIndex);
		const lastPos = doc.positionAt(lastIndex);
		const beforeName = groups.beforeName;
		const nameStartPos = doc.positionAt(index + beforeName.length);
		const nameLastPos = doc.positionAt(index + beforeName.length + name.length);
		return {
			name: name,
			returnType: returnType,
			range: Range.create(startPos, closure === ClosureStatus.Closed ? lastPos : docLastPos),
			nameRange: Range.create(nameStartPos, nameLastPos),
			selectionRange: Range.create(startPos, lastPos),
		};
	}
}
