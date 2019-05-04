import {
	DocumentSymbol,
	DocumentSymbolParams,
	Position,
	Range,
	SymbolInformation,
	SymbolKind,
	TextDocument,
	WorkspaceSymbolParams
} from 'vscode-languageserver';

import { PureBasicParser } from './PureBasicParser';
import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	private readonly BLOCK_PARSERS: { kind: SymbolKind, regex: RegExp }[] = [
		{
			kind: SymbolKind.Function,
			regex: pb.parser.declareBlock().withStartKeyword(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL']).withOptionalType().andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndProcedure').toRegex()
		}, {
			kind: SymbolKind.Interface,
			regex: pb.parser.declareBlock().withStartKeyword(['Interface']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndInterface').toRegex()
		}, {
			kind: SymbolKind.Struct,
			regex: pb.parser.declareBlock().withStartKeyword(['Structure']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndStructure').toRegex()
		}, {
			kind: SymbolKind.Enum,
			regex: pb.parser.declareBlock().withStartKeyword(['Enumeration', 'EnumerationBinary']).andSpaces()
				.withName(true).withBody(true).withEndKeyword('EndEnumeration').toRegex()
		}, {
			kind: SymbolKind.Module,
			regex: pb.parser.declareBlock().withStartKeyword(['DeclareModule']).andSpaces()
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
	public load(doc: TextDocument): Thenable<DocumentSymbol[]> {
		const simplifiedText = pb.text.simplify(doc.getText());
		let symbols: DocumentSymbol[] = [];
		pb.symbols.BLOCK_PARSERS.forEach(blockParser => {
			let result: RegExpExecArray;
			while ((result = blockParser.regex.exec(simplifiedText)) !== null) {
				const block = pb.parser.parseBlock(doc, result);
				const symbol = DocumentSymbol.create(block.name.value, '...', blockParser.kind, block.whole.pos, block.name.pos)
				symbols.push(symbol);
			}
		});
		/*let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri),
			zzz = SymbolInformation.create('zzz', SymbolKind.Property, Range.create(20, 2, 23, 3), params.textDocument.uri);
		*/
		this.documentSymbols.set(doc.uri, symbols);
		return Promise.resolve(symbols);
	}
	/**
	* Delete symbols before closing document
	* @param doc
	*/
	public delete(doc: TextDocument) {
		this.documentSymbols.delete(doc.uri);
	}
	/**
	 * Get document symbols (used by outline view)
	 * @param params
	 */
	public getDocumentSymbols(params: DocumentSymbolParams) {
		return pb.symbols.documentSymbols.get(params.textDocument.uri);
	}
	/**
	 * Get workspace symbols
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams) {
		//params.query
		return [];
	}
}
