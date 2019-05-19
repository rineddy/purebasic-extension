import {
	DocumentSymbol,
	DocumentSymbolParams,
	Position,
	Range,
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
	public async load(doc: TextDocument): Promise<DocumentSymbol[]> {
		const parsedText = pb.text.parseText(doc);
		let symbols = await Promise.all(pb.symbols.BLOCK_PARSERS.map(async blockParser => {
			let startResult: RegExpExecArray;
			let symbols = [];
			blockParser.startRegex.lastIndex = 0;
			while ((startResult = blockParser.startRegex.exec(parsedText.text)) !== null) {
				blockParser.endRegex.lastIndex = blockParser.startRegex.lastIndex;
				const endResult = blockParser.endRegex.exec(parsedText.text);
				const endOffset = (endResult) ? blockParser.endRegex.lastIndex : doc.offsetAt(Position.create(doc.lineCount, 0));

				pb.connection.console.log(`-- ${startResult.index} --- ${endOffset}`);


				blockParser.startRegex.lastIndex = endOffset;


				const startOffset = startResult.index;
				const rg = Range.create(doc.positionAt(startOffset), doc.positionAt(endOffset));
				const rgSelection = Range.create(doc.positionAt(startOffset + startResult['groups'].beforeName.length),
					doc.positionAt(startOffset + startResult['groups'].beforeName.length + startResult['groups'].name.length));
				const name = startResult['groups'].name;
				const s = DocumentSymbol.create(name, '', blockParser.vskind, rg, rgSelection);
				symbols.push(s);
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
