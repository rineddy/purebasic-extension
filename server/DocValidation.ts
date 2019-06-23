import { Diagnostic, TextDocument } from 'vscode-languageserver';
import { DocSettings } from './DocSettings';
import { DocSymbolMapper } from './DocSymbolMapper';
import { ClientConnection } from './ClientConnection';

/**
 * Service for document validation
 */
export class DocValidation {
	public static instance = new DocValidation();

	private constructor() { }

	public async validate(doc: TextDocument) {
		// get settings and doc symbols for every validate run.
		const settings = await DocSettings.instance.load(doc);
		const symbols = await DocSymbolMapper.instance.load(doc);

		let diagnosticMax = settings.diagnostics.maxNumberOfProblems;
		let diagnostics: Diagnostic[] = symbols.map(s => s.type.validator.validate(s))
			.filter(d => d)
			.slice(0, diagnosticMax);

		// Send the computed diagnostics to VSCode.
		ClientConnection.instance.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
