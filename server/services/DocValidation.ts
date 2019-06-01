import { Diagnostic, TextDocument } from 'vscode-languageserver';

import { Client } from './Client';
import { DocMapping } from './DocMapping';
import { DocSettings } from './DocSettings';

/**
 * Service for document validation
 */
export class DocValidation {
	public static service = new DocValidation();

	private constructor() { }

	public async validate(doc: TextDocument) {
		// get settings and doc symbols for every validate run.
		const settings = await DocSettings.service.load(doc);
		const symbols = await DocMapping.service.load(doc);

		let diagnosticMax = settings.diagnostics.maxNumberOfProblems;
		let diagnostics: Diagnostic[] = symbols.map(s => s.type.validator.validate(s))
			.filter(d => d)
			.slice(0, diagnosticMax);

		// Send the computed diagnostics to VSCode.
		Client.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
