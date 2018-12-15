import {
	DidChangeTextDocumentParams,
	DidOpenTextDocumentParams,
	Range,
	SymbolInformation,
	TextDocument,
	TextDocumentIdentifier,
	TextDocuments,
} from 'vscode-languageserver';
import { ICustomReadLine, pb } from './PureBasicAPI';

export class PureBasicDocumentation extends TextDocuments {
	/**
	 * Find doc instance identified by `docInfo`
	 * @param docInfo
	 */
	public find(docInfo: TextDocumentIdentifier | string): Thenable<TextDocument> {
		let doc: TextDocument | undefined;
		if (typeof (docInfo) === 'string') {
			doc = pb.documentation.get(docInfo);
		}
		else {
			doc = pb.documentation.get(docInfo.uri);
		}
		return doc ? Promise.resolve(doc) : Promise.reject(`Invalid docInfo: ${docInfo.toString()}`);
	}
	/**
	 * Read doc line
	 * @param doc
	 * @param line line to read
	 * @param lineCharacter line last character position ( or end of line position if 'undefined' )
	 */
	public readLine(doc: TextDocument, line: number, lineCharacter?: number): ICustomReadLine {
		const rg = Range.create(line, 0, line, lineCharacter ? lineCharacter : Number.MAX_SAFE_INTEGER);
		const rgCut = lineCharacter ? Range.create(line, lineCharacter, line, Number.MAX_SAFE_INTEGER) : undefined;
		return {
			lineRange: rg,
			lineText: doc.getText(rg),
			lineCutRange: rgCut,
			lineCutText: rgCut ? doc.getText(rgCut) : undefined,
		};
	}
}