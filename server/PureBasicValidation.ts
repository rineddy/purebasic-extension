import {
	Diagnostic,
	TextDocument
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicValidation {
	/**
	 * Detects any anomalies in source code
	 * @param doc
	 */
	public async validate(doc: TextDocument) {
		// get settings and doc symbols for every validate run.
		const settings = await pb.settings.load(doc);
		const symbols = await pb.symbols.load(doc);

		let diagnosticMax = settings.diagnostics.maxNumberOfProblems;
		let diagnostics: Diagnostic[] = symbols.map(s => s.parser.validator.validate(s))
			.filter(d => d)
			.slice(0, diagnosticMax);

		// Send the computed diagnostics to VSCode.
		pb.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
