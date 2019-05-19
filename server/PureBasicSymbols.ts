import {
	DocumentSymbol,
	DocumentSymbolParams,
	SymbolInformation,
	SymbolKind,
	TextDocument
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export enum PureBasicKind {
	All = 0xFF,
	None = 0,
	Module = 1 << 0,
	Procedure = 1 << 1,
	Interface = 1 << 2,
	Structure = 1 << 3,
	Enumeration = 1 << 4,
	Import = 1 << 5
}
export class PureBasicSymbols {
	private readonly BLOCK_PARSERS: {
		pbKind: PureBasicKind,
		vskind: SymbolKind,
		startRegex: RegExp,
		endRegex?: RegExp,
		contains: PureBasicKind
	}[] = [
			{
				pbKind: PureBasicKind.Module,
				vskind: SymbolKind.Module,
				startRegex: pb.regex.startWith().newLine().keyword('DeclareModule').spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndDeclareModule').toRegex(),
				contains: (PureBasicKind.All & ~PureBasicKind.Module)
			}, {
				pbKind: PureBasicKind.Procedure,
				vskind: SymbolKind.Function,
				startRegex: pb.regex.startWith().newLine().keyword(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL']).type().spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndProcedure').toRegex(),
				contains: PureBasicKind.None
			}, {
				pbKind: PureBasicKind.Interface,
				vskind: SymbolKind.Interface,
				startRegex: pb.regex.startWith().newLine().keyword('Interface').spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndInterface').toRegex(),
				contains: PureBasicKind.None
			}, {
				pbKind: PureBasicKind.Structure,
				vskind: SymbolKind.Struct,
				startRegex: pb.regex.startWith().newLine().keyword('Structure').spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndStructure').toRegex(),
				contains: PureBasicKind.None
			}, {
				pbKind: PureBasicKind.Enumeration,
				vskind: SymbolKind.Enum,
				startRegex: pb.regex.startWith().newLine().keyword(['Enumeration', 'EnumerationBinary']).spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndEnumeration').toRegex(),
				contains: PureBasicKind.None
			}, {
				pbKind: PureBasicKind.Import,
				vskind: SymbolKind.Package,
				startRegex: pb.regex.startWith().newLine().keyword(['Import', 'ImportC']).spaces().name().toRegex(),
				endRegex: pb.regex.startWith().newLine().keyword('EndImport').toRegex(),
				contains: PureBasicKind.None
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
	public load(doc: TextDocument): Promise<DocumentSymbol[]> {
		const parsedText = pb.text.parseText(doc);
		while (pb.text.nextStartWord(parsedText)) {

		}
		const docSymbols = parsedText.symbols.map(s => s.docSymbol);
		pb.symbols.documentSymbols.set(doc.uri, docSymbols);
		return Promise.resolve(docSymbols);
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
