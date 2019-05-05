import {
	Diagnostic,
	DiagnosticSeverity,
	SymbolKind,
	TextDocument
} from 'vscode-languageserver';

import { pb } from './PureBasicAPI';

export class PureBasicValidation {
	private readonly VALID_NAME_ALPHANUMERIC = /^[a-z_]\w+$/i;
	private readonly VALID_NAME_ALPHANUMERIC_DOLLAR = /^[a-z_]\w+[$]?$/i;

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
		symbols.filter(s => {
			switch (s.kind) {
				case SymbolKind.Struct: return s.name.match(this.VALID_NAME_ALPHANUMERIC_DOLLAR) == null;
				default: return s.name.match(this.VALID_NAME_ALPHANUMERIC) == null;
			}
		}).slice(0, maxProblems).forEach(s => {
			let diagnosic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: s.selectionRange,
				message: `The identifier name '${s.name}' contains some unexpected characters.`,
				source: 'PB1000'
			};
			/*if (pb.settings.hasDiagnosticRelatedInformationCapability) {
				diagnosic.relatedInformation = [
					{
						location: {
							uri: doc.uri,
							range: Object.assign({}, diagnosic.range)
						},
						message: 'Spelling matters'
					},
					{
						location: {
							uri: doc.uri,
							range: Object.assign({}, diagnosic.range)
						},
						message: 'Particularly for names'
					}
				];
			}*/
			diagnostics.push(diagnosic);
			maxProblems--;
		});

		// Send the computed diagnostics to VSCode.
		pb.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
