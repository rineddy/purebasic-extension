import { DocSymbol, DocTokenizer, pb } from './PureBasicAPI';
import { DocumentSymbolParams, SymbolInformation, TextDocument, WorkspaceSymbolParams } from 'vscode-languageserver';

/**
 * Service for document code mapping
 */
export class DocSymbolMap {
	public static service = new DocSymbolMap();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();

	private constructor() { }

	public async load(doc: TextDocument): Promise<DocSymbol[]> {
		const tokenizer = new DocTokenizer(doc);
		const symbols = [];
		for (const token of tokenizer.nextToken()) {

			// symbols.push(token.GetSymbol());
		}
		this.cachedDocSymbols.set(doc.uri, symbols);
		return Promise.resolve(symbols);
	}
	public delete(doc: TextDocument) {
		this.cachedDocSymbols.delete(doc.uri);
	}
	public async getDocSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		let symbols: DocSymbol[];
		if (!this.cachedDocSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			symbols = await this.load(doc);
		}
		else {
			symbols = this.cachedDocSymbols.get(params.textDocument.uri);
		}
		return symbols.filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
