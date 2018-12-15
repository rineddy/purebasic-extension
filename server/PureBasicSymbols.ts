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
		return [
			SymbolInformation.create('Module', SymbolKind.Module, Range.create(0, 1, 6, 1), params.textDocument.uri),
			SymbolInformation.create('Function', SymbolKind.Function, Range.create(1, 2, 2, 3), params.textDocument.uri, 'Module'),
			SymbolInformation.create('Property', SymbolKind.Property, Range.create(3, 2, 3, 3), params.textDocument.uri, 'Module'),

			SymbolInformation.create('Module', SymbolKind.Struct, Range.create(14, 1, 19, 1), params.textDocument.uri, 'Module'),
			SymbolInformation.create('Field', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri, 'Module'),
			SymbolInformation.create('Constant', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri, 'Module'),
			SymbolInformation.create('Namespace', SymbolKind.Namespace, Range.create(8, 1, 9, 1), params.textDocument.uri),
		];
	}
	/**
	 *
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		return [];
	}
}