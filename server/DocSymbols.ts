import { Diagnostic, DocumentSymbol, Range } from 'vscode-languageserver';

import { DocSymbolType } from './DocSymbolType';

/**
 * Document symbol (with nested symbols)
 */
export class DocSymbol extends DocumentSymbol {
	public nameRange?: Range;
	public type: DocSymbolType;
	public isRootSymbol: boolean;
	public validationDiagnostic?: Diagnostic;

	public constructor(init?: Partial<DocSymbol>) {
		super();
		Object.assign(this, init);
	}
}