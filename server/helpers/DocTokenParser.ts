import { DocumentSymbol, Range } from 'vscode-languageserver';
import { ClosureStatus, DocSymbol, DocSymbolType, DocToken, DocTokenRegex, ParsingContext } from '../models';

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

	public parse(token: DocToken, context: ParsingContext): boolean {
		const { tokenizer, openedSymbols } = context;
		if (this.openRegex.test(token.groups.name) && (!this.parentType || (openedSymbols.length > 0 && this.parentType === openedSymbols[0].type))) {
			token.type = this.type;
			token.closure = (this.closeRegex === undefined) ? ClosureStatus.Closed : undefined;
		}
		else if (this.closeRegex && this.closeRegex.test(token.groups.name)) {
			token.type = this.type;
			token.closure = ClosureStatus.Closing;
		}
		if (token.type) {
			if (token.closure === ClosureStatus.Closing) {
				this.closeSymbol(token, context);
			} else {
				if (this.contentRegex) {
					for (const extendedToken of tokenizer.extendToken(token, this.contentRegex)) {
						this.openSymbol(extendedToken, context);
					}
				} else {
					this.openSymbol(token, context);
				}
			}
			return true;
		}
	}
	private openSymbol(token: DocToken, context: ParsingContext) {
		const { symbols, openedSymbols } = context;
		const { name, range, selectionRange, nameRange } = this.extractSymbolInfo(token, context);
		const docSymbol = DocumentSymbol.create(name, token.type.detail, token.type.icon, range, selectionRange, []);
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
	private closeSymbol(token: DocToken, context: ParsingContext) {
		const { tokenizer: { doc }, openedSymbols } = context;
		openedSymbols.some((openedSymbol, id) => {
			if (openedSymbol.type === token.type) {
				openedSymbol.range.end = doc.positionAt(token.lastIndex);
				this.alignToClosingSymbol(openedSymbol, context);
				context.openedSymbols = openedSymbols.splice(id + 1);
				return true;
			}
		});
	}
	private alignToClosingSymbol(lastSymbol: DocSymbol, context: ParsingContext) {
		const { openedSymbols } = context;
		const endPos = lastSymbol.range.end;
		for (const openedSymbol of openedSymbols) {
			if (openedSymbol === lastSymbol) break;
			openedSymbol.range.end = endPos;
		}
	}
	private extractSymbolInfo(token: DocToken, context: ParsingContext) {
		const { tokenizer: { doc, docLastPos } } = context;
		const { groups, startIndex, index, lastIndex, closure } = token;
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
