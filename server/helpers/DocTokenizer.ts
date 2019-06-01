import { DocumentSymbol, Position, Range, TextDocument } from 'vscode-languageserver';

import { ClosureStatus } from '../models/ClosureStatus';
import { DocSymbol } from '../models/DocSymbol';
import { DocToken } from '../models/DocToken';
import { DocTokenRegex } from '../models/DocTokenRegex';

/**
 * Service for document code mapping
 */
export class DocTokenizer {
	readonly text: string;
	readonly doc: TextDocument;
	readonly docLastPos: Position;
	readonly symbols: DocSymbol[];
	openedSymbols: DocSymbol[];
	startIndex: number;
	lastIndex: number;

	public constructor(doc: TextDocument) {
		Object.assign(this, <DocTokenizer>{
			text: doc.getText(),
			doc: doc,
			docLastPos: Position.create(doc.lineCount, 0),
			startIndex: 0,
			lastIndex: 0,
			symbols: [],
			openedSymbols: [],
		});
	}

	public *nextToken(regex: DocTokenRegex, count = -1) {
		let res: RegExpExecArray;
		regex.lastIndex = this.lastIndex;
		while ((res = regex.exec(this.text)) && count-- !== 0) {
			this.lastIndex = regex.lastIndex;
			yield new DocToken({
				index: res.index,
				groups: res['groups'] || {}
			});
			regex.lastIndex = this.lastIndex;
		}
	}
	public *siblingToken(regex: DocTokenRegex, count = -1) {
		let res: RegExpExecArray;
		regex.lastIndex = this.lastIndex;
		while ((res = regex.exec(this.text)) && res.index === this.lastIndex && count-- !== 0) {
			this.lastIndex = regex.lastIndex;
			yield new DocToken({
				index: res.index,
				groups: res['groups'] || {}
			});
			regex.lastIndex = this.lastIndex;
		}
	}
	public openSymbol(token: DocToken) {
		const { name, range, selectionRange, nameRange } = this.extractSymbolInfo(token);
		const docSymbol = DocumentSymbol.create(name, '', token.type.icon, range, selectionRange, []);
		const parsedSymbol = new DocSymbol({
			...docSymbol,
			nameRange: nameRange,
			type: token.type,
		});
		if (this.openedSymbols.length > 0) {
			this.openedSymbols[0].children.push(parsedSymbol);
			if (token.closure !== ClosureStatus.Closed) { this.openedSymbols.unshift(parsedSymbol); }
		} else {
			if (token.closure !== ClosureStatus.Closed) { this.openedSymbols.unshift(parsedSymbol); }
			parsedSymbol.isRootSymbol = true;
		}
		this.symbols.push(parsedSymbol);
	}
	public closeSymbol(token: DocToken) {
		this.openedSymbols.some((openedSymbol, index) => {
			if (openedSymbol.type === token.type) {
				openedSymbol.detail = `(closed at ${this.lastIndex})`;
				openedSymbol.range.end = this.doc.positionAt(this.lastIndex);
				this.alignToClosingSymbol(openedSymbol);
				this.openedSymbols = this.openedSymbols.splice(index + 1);
				return true;
			}
		});
	}
	private alignToClosingSymbol(lastSymbol: DocSymbol) {
		const endPos = lastSymbol.range.end;
		for (const openedSymbol of this.openedSymbols) {
			if (openedSymbol === lastSymbol) break;
			openedSymbol.range.end = endPos;
		}
	}
	private extractSymbolInfo(token: DocToken) {
		const { groups, index, closure } = token;
		const name = groups.name;
		const returnType = groups.returnType;
		const startPos = this.doc.positionAt(this.startIndex);
		const lastPos = this.doc.positionAt(this.lastIndex);
		const beforeName = groups.beforeName;
		const nameStartPos = this.doc.positionAt(index + beforeName.length);
		const nameLastPos = this.doc.positionAt(index + beforeName.length + name.length);
		return {
			name: name,
			returnType: returnType,
			range: Range.create(startPos, closure === ClosureStatus.Closed ? lastPos : this.docLastPos),
			nameRange: Range.create(nameStartPos, nameLastPos),
			selectionRange: Range.create(startPos, lastPos),
		};
	}
}