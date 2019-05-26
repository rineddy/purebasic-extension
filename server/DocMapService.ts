import {
	DocumentSymbolParams,
	SymbolInformation,
	TextDocument,
	WorkspaceSymbolParams
} from 'vscode-languageserver';

import { DocSymbol } from './DocSymbols';
import { pb } from './PureBasicAPI';

/**
 * Service for document code mapping
 */
export class DocMap {
	public static service = new DocMap();
	private readonly cachedDocumentSymbols: Map<string, DocSymbol[]> = new Map();

	private constructor() { }

	public load(doc: TextDocument): Promise<DocSymbol[]> {
		const parsedText = pb.text.parseText(doc);
		while (pb.text.nextSymbol(parsedText)) { }
		this.cachedDocumentSymbols.set(doc.uri, parsedText.symbols);
		return Promise.resolve(parsedText.symbols);
	}
	public delete(doc: TextDocument) {
		this.cachedDocumentSymbols.delete(doc.uri);
	}
	public async getDocSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		let symbols: DocSymbol[];
		if (!this.cachedDocumentSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			symbols = await this.load(doc);
		}
		else {
			symbols = this.cachedDocumentSymbols.get(params.textDocument.uri);
		}
		return symbols.filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
