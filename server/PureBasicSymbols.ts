import {
	DocumentSymbolParams,
	Range,
	SymbolInformation,
	SymbolKind,
	TextDocument,
	WorkspaceSymbolParams
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	/**
	 *
	 * @param document
	 */
	public collect(doc: TextDocument) {
		const text = doc.getText();
		const simplifiedText = pb.text.simplify(text);
	}
	/**
	 *
	 * @param params
	 */
	public getDocumentSymbols(params: DocumentSymbolParams): SymbolInformation[] {
		let m = SymbolInformation.create('Module::', SymbolKind.Struct, Range.create(0, 1, 3, 1), params.textDocument.uri);
		let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri),
			c = SymbolInformation.create('c', SymbolKind.Namespace, Range.create(8, 1, 9, 1), params.textDocument.uri);
		a.containerName = m.name;
		b.containerName = m.name;
		c.containerName = m.name;

		let zz = SymbolInformation.create('zz', SymbolKind.Function, Range.create(20, 2, 22, 3), params.textDocument.uri),
			zzz = SymbolInformation.create('zzz', SymbolKind.Property, Range.create(20, 2, 23, 3), params.textDocument.uri);
		zz.containerName = m.name;
		zzz.containerName = m.name;
		return [
			m,
			a, b, c,
			zz, zzz
		];
	}
	/**
	 *
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		let m = SymbolInformation.create('Module::', SymbolKind.Struct, Range.create(0, 1, 3, 1));
		let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3)),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3)),
			c = SymbolInformation.create('c', SymbolKind.Namespace, Range.create(8, 1, 9, 1));
		a.containerName = m.name;
		b.containerName = m.name;
		c.containerName = m.name;

		return [
			m,
			a, b, c
		];
		return [];
	}
}