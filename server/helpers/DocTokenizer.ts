import { Position, TextDocument } from 'vscode-languageserver';
import { DocSymbol, DocToken, DocTokenRegex } from '../models';

/**
 * Service for document code mapping
 */
export class DocTokenizer {
	readonly text: string;
	readonly doc: TextDocument;
	readonly docLastPos: Position;
	readonly symbols: DocSymbol[];
	openedSymbols: DocSymbol[];
	lastIndex: number;

	public constructor(doc: TextDocument) {
		Object.assign(this, <DocTokenizer>{
			text: doc.getText(),
			doc: doc,
			docLastPos: Position.create(doc.lineCount, 0),
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
				lastIndex: this.lastIndex,
				groups: res['groups'] || {}
			});
			regex.lastIndex = this.lastIndex;
		}
	}
	public *extendToken(token: DocToken, regex: DocTokenRegex) {
		let res: RegExpExecArray;
		regex.lastIndex = this.lastIndex;
		if ((res = regex.exec(this.text)) && res.index === token.lastIndex) {
			this.lastIndex = regex.lastIndex;
			yield new DocToken({
				...token,
				index: res.index,
				lastIndex: this.lastIndex,
				groups: res['groups'] || {}
			});
		}
	}

}