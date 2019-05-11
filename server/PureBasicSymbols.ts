import {
	DocumentSymbol,
	DocumentSymbolParams,
	SymbolInformation,
	SymbolKind,
	TextDocument
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	private readonly BLOCK_PARSERS: { kind: SymbolKind, regex: RegExp }[] = [
		{
			kind: SymbolKind.Function,
			regex: pb.regex.declareBlock().withStartKeyword(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL']).withOptionalType().andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndProcedure').toRegex()
		}, {
			kind: SymbolKind.Interface,
			regex: pb.regex.declareBlock().withStartKeyword(['Interface']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndInterface').toRegex()
		}, {
			kind: SymbolKind.Struct,
			regex: pb.regex.declareBlock().withStartKeyword(['Structure']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndStructure').toRegex()
		}, {
			kind: SymbolKind.Enum,
			regex: pb.regex.declareBlock().withStartKeyword(['Enumeration', 'EnumerationBinary']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndEnumeration').toRegex()
		}, {
			kind: SymbolKind.Module,
			regex: pb.regex.declareBlock().withStartKeyword(['DeclareModule']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndDeclareModule').toRegex()
		}
	];

	/**
	 * Cache the symbols of all open documents
	 */
	private documentSymbols: Map<string, DocumentSymbol[]> = new Map();

	/**
	 * Load symbols after opening document
	 * @param doc
	 */
	public async load(doc: TextDocument): Promise<DocumentSymbol[]> {
		const simplifiedText = pb.parser.simplify(doc.getText());
		let symbols = await Promise.all(pb.symbols.BLOCK_PARSERS.map(async blockParser => {
			let result: RegExpExecArray;
			let symbols: DocumentSymbol[] = [];
			while ((result = blockParser.regex.exec(simplifiedText)) !== null) {
				const block = pb.regex.parseBlock(doc, result);
				const symbol = DocumentSymbol.create(block.name.value, '...', blockParser.kind, block.whole.pos, block.name.pos);
				symbols.push(symbol);
			}
			return symbols;
		})).then(symbolsCollection => [].concat.apply([], symbolsCollection) as DocumentSymbol[]);
		pb.symbols.documentSymbols.set(doc.uri, symbols);
		return symbols;
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
	public async getDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[]> {
		if (!pb.symbols.documentSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			const symbols = await pb.symbols.load(doc);
			return symbols;
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
