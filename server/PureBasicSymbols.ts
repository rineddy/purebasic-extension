import {
	DocumentSymbolParams,
	SymbolInformation,
	TextDocument
} from 'vscode-languageserver';

import { DocSymbol } from './DocSymbols';
import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	/**
	 * Cache the symbols of all open documents
	 */
	private documentSymbols: Map<string, DocSymbol[]> = new Map();

	/**
	 * Load symbols after opening document
	 * @param doc
	 */
	public load(doc: TextDocument): Promise<DocSymbol[]> {
		const parsedText = pb.text.parseText(doc);
		while (pb.text.nextSymbol(parsedText)) { }
		pb.symbols.documentSymbols.set(doc.uri, parsedText.symbols);
		return Promise.resolve(parsedText.symbols);
	}
	/**
	* Delete symbols before closing document
	* @param doc
	*/
	public delete(doc: TextDocument) {
		pb.symbols.documentSymbols.delete(doc.uri);
	}
	/**
	 * Get document symbols (used by 'outline' view)
	 * @param params
	 */
	public async getDocumentSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		let symbols: DocSymbol[];
		if (!pb.symbols.documentSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			symbols = await pb.symbols.load(doc);
		}
		else {
			symbols = pb.symbols.documentSymbols.get(params.textDocument.uri);
		}
		return symbols.filter(s => s.isRootSymbol);
	}
	/**
	 * Get workspace symbols
	 * @param params
	 */
	public async getWorkspaceSymbols(): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
