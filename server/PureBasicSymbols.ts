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
	public readonly SEARCHING_SYMBOLS: { kind: SymbolKind, regex: RegExp; }[] = [
		/*{ kind: SymbolKind.Interface, regex: pb.symbols.captureKeywordBlock(['Interface'], 'EndInterface') },
		{ kind: SymbolKind.Function, regex: pb.symbols.captureKeywordBlock(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL'], 'EndProcedure') }*/
	];

	/**
	 *
	 * @param document
	 */
	public collect(doc: TextDocument) {
		const text = doc.getText();
		const simplifiedText = pb.text.simplify(text);
		/*this.SEARCHING_SYMBOLS.forEach(searching => {
			let m: RegExpExecArray;
			while ((m = searching.regex.exec(text)) !== null) {
				SymbolInformation.create(m[2], searching.kind, Range.create( m.index + m[1].length, 1), doc.uri);
			}
		});*/
	}
	/**
	 *
	 * @param params
	 */
	public getDocumentSymbols(params: DocumentSymbolParams): DocumentSymbol[] {

		let m = DocumentSymbol.create('Module::', 'coucou', SymbolKind.Struct, Range.create(2, 0, 5, 10), Range.create(3, 0, 3, 6));
		/*let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri),
			c = SymbolInformation.create('c', SymbolKind.Namespace, Range.create(8, 1, 9, 1), params.textDocument.uri);
		a.containerName = m.name;
		b.containerName = m.name;
		c.containerName = m.name;

		let zz = SymbolInformation.create('zz', SymbolKind.Function, Range.create(20, 2, 22, 3), params.textDocument.uri),
			zzz = SymbolInformation.create('zzz', SymbolKind.Property, Range.create(20, 2, 23, 3), params.textDocument.uri);
		zz.containerName = m.name;
		zzz.containerName = m.name;*/
		return [
			m,
			/*a, b, c,
			zz, zzz*/
		];
	}
	/**
	 *
	 *
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		return [];
	}
	private captureKeywordBlock(startKeyWords: string[], endKeyword: string): RegExp {
		const startKeyWordsRegex = startKeyWords.join('|');
		return new RegExp(`((?:^|:)[\t ]*${startKeyWordsRegex}\s+)(\w+)([\s\S]*?)(?:(?:^|:)[\t ]*${endKeyword}|Z)`, 'gmi');
	}
}