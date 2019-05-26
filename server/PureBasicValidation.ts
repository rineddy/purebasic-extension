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

		let diagnostics: Diagnostic[] = [];
		let maxProblems = settings.diagnostics.maxNumberOfProblems;

		symbols.filter(s => !s.validate())
			.slice(0, maxProblems)
			.forEach(s => {
				diagnostics.push(s.validationDiagnostic);
				maxProblems--;
			});

		// Send the computed diagnostics to VSCode.
		pb.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
