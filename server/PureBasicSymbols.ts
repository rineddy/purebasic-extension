import {
	DocumentSymbolParams,
	SymbolInformation,
	TextDocument
} from 'vscode-languageserver';

import { ParsedSymbol } from './PureBasicDataModels';
import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	/**
	 * Cache the symbols of all open documents
	 */
	private documentSymbols: Map<string, ParsedSymbol[]> = new Map();

	/**
	 * Load symbols after opening document
	 * @param doc
	 */
	public load(doc: TextDocument): Promise<ParsedSymbol[]> {
		const parsedText = pb.text.parseText(doc);
		while (pb.text.nextSymbol(parsedText)) {

		}
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
	public async getDocumentSymbols(params: DocumentSymbolParams): Promise<ParsedSymbol[]> {
		if (!pb.symbols.documentSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			return await pb.symbols.load(doc);
		}
		else {
			return pb.symbols.documentSymbols.get(params.textDocument.uri);
		}
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
