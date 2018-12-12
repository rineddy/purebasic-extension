import {
	DocumentSymbolParams,
	Range,
	SymbolInformation,
	SymbolKind,
	WorkspaceSymbolParams
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	public getDocumentSymbols(params: DocumentSymbolParams): SymbolInformation[] {
		return [
			SymbolInformation.create('module', SymbolKind.Module, Range.create(0, 1, 5, 1), params.textDocument.uri),
			SymbolInformation.create('func', SymbolKind.Function, Range.create(1, 2, 2, 3), params.textDocument.uri, 'module')
		];
	}

	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		return [];
	}
}