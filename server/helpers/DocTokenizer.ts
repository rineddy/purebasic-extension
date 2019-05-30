import { DocumentSymbol, Position, Range, TextDocument } from 'vscode-languageserver';

import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolParser } from './DocSymbolParser';
import { DocToken } from '../models/DocToken';
import { ParsedSymbolSignature } from '../PureBasicDataModels';

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
		Object.assign(this, {
			text: doc.getText(),
			doc: doc,
			docLastPos: Position.create(doc.lineCount, 0),
			startIndex: 0,
			lastIndex: 0,
			symbols: [],
			openedSymbols: [],
		});
	}

	public *nextToken(regex: RegExp, count = -1) {
		let res: RegExpExecArray;
		while ((res = regex.exec(this.text)) && count-- !== 0) {
			this.lastIndex = regex.lastIndex;
			yield new DocToken({
				index: res.index,
				groups: res['groups'] || {}
			});
			regex.lastIndex = this.lastIndex;
		}
	}
	public *siblingToken(regex: RegExp, count = -1) {
		let res: RegExpExecArray;
		while ((res = regex.exec(this.text)) && res.index === this.lastIndex && count-- !== 0) {
			this.lastIndex = regex.lastIndex;
			yield new DocToken({
				index: res.index,
				groups: res['groups'] || {}
			});
			regex.lastIndex = this.lastIndex;
		}
	}
	public getSymbolSignature(token: DocToken, isClosed?: boolean) {
		const { groups, index } = token;
		const name = groups.name;
		const returnType = groups.returnType;
		const startPos = this.doc.positionAt(this.startIndex);
		const lastPos = this.doc.positionAt(this.lastIndex);
		const beforeName = groups.beforeName;
		const nameStartPos = this.doc.positionAt(index + beforeName.length);
		const nameLastPos = this.doc.positionAt(index + beforeName.length + name.length);
		return <ParsedSymbolSignature>{
			name: name,
			returnType: returnType,
			range: Range.create(startPos, isClosed ? lastPos : this.docLastPos),
			nameRange: Range.create(nameStartPos, nameLastPos),
			selectionRange: Range.create(startPos, lastPos),
		};
	}
	public openSymbol(parser: DocSymbolParser, sign: ParsedSymbolSignature) {
		const docSymbol = DocumentSymbol.create(sign.name, '', parser.type.icon, sign.range, sign.selectionRange, []);
		const parsedSymbol = new DocSymbol({
			...docSymbol,
			nameRange: sign.nameRange,
			type: parser.type,
		});
		if (this.openedSymbols.length > 0) {
			this.openedSymbols[0].children.push(parsedSymbol);
			if (!parser.isClosed) { this.openedSymbols.unshift(parsedSymbol); }
		} else {
			if (!parser.isClosed) { this.openedSymbols.unshift(parsedSymbol); }
			parsedSymbol.isRootSymbol = true;
		}
		this.symbols.push(parsedSymbol);
	}
	public closeSymbol(parser: DocSymbolParser) {
		this.openedSymbols.forEach((openedSymbol, index) => {
			if (openedSymbol.type === parser.type) {
				openedSymbol.detail = `(closed at ${this.lastIndex})`;
				openedSymbol.range.end = this.doc.positionAt(this.lastIndex);
				this.alignToClosingSymbol(openedSymbol);
				this.openedSymbols = this.openedSymbols.splice(index + 1);
				return;
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

}