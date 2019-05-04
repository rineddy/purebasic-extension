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

import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	private readonly SEARCHING_SYMBOLS: { kind: SymbolKind, regex: RegExp }[] = [
		{
			kind: SymbolKind.Function,
			regex: pb.parser.createBLock().withStartKeyword(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL']).withOptionalType().andSpaces().asPrefix()
				.withName().withBody().withEndKeyword('EndProcedure').toRegex()
		}, {
			kind: SymbolKind.Interface,
			regex: pb.parser.createBLock().withStartKeyword(['Interface']).andSpaces().asPrefix()
				.withName().withBody().withEndKeyword('EndInterface').toRegex()
		}, {
			kind: SymbolKind.Struct,
			regex: pb.parser.createBLock().withStartKeyword(['Structure']).andSpaces().asPrefix()
				.withName().withBody().withEndKeyword('EndStructure').toRegex()
		}, {
			kind: SymbolKind.Enum,
			regex: pb.parser.createBLock().withStartKeyword(['Enumeration', 'EnumerationBinary']).andSpaces().asPrefix()
				.withName().withBody().withEndKeyword('EndEnumeration').toRegex()
		}, {
			kind: SymbolKind.Module,
			regex: pb.parser.createBLock().withStartKeyword(['DeclareModule']).andSpaces().asPrefix()
				.withName().withBody().withEndKeyword('EndDeclareModule').toRegex()
		}
	];

	/**
	 *
	 * @param params
	 */
	public async getDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[]> {
		const doc = await pb.documentation.find(params.textDocument);
		const text = doc.getText();
		const simplifiedText = pb.text.simplify(text);
		let symbols = [];
		pb.symbols.SEARCHING_SYMBOLS.forEach(searching => {
			let m: RegExpExecArray;
			while ((m = searching.regex.exec(simplifiedText)) !== null) {
				let rgBlock = Range.create(doc.positionAt(m.index), doc.positionAt(m.index + m[0].length));
				let p1 = m.index + m.groups.prefix.length;
				let p2 = p1 + m.groups.name.length;
				let rgSelection = Range.create(doc.positionAt(p1), doc.positionAt(p2));
				symbols.push(DocumentSymbol.create(m.groups.name, '...', searching.kind, rgBlock, rgSelection));
			}
		});
		/*let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri),
			zzz = SymbolInformation.create('zzz', SymbolKind.Property, Range.create(20, 2, 23, 3), params.textDocument.uri);
		*/
		return symbols;
	}
	/**
	 *
	 *
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		return [];
	}
}
