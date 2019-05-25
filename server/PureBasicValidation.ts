import {
	Diagnostic,
	DiagnosticSeverity,
	TextDocument
} from 'vscode-languageserver';
import { ParsedSymbolKind, pb } from './PureBasicAPI';

export class PureBasicValidation {
	private readonly VALID_NAME_ALPHANUMERIC = /^[a-z_]\w*$/i;
	private readonly VALID_NAME_ALPHANUMERIC_DOLLAR = /^[a-z_]\w*[$]?$/i;

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
			switch (s.rule.kind) {
				case ParsedSymbolKind.Structure: return !this.VALID_NAME_ALPHANUMERIC_DOLLAR.test(s.name);
				default: return !this.VALID_NAME_ALPHANUMERIC.test(s.name);
			}
		}).slice(0, maxProblems).forEach(s => {
			let diagnosic: Diagnostic = {
				severity: DiagnosticSeverity.Error,
				range: s.nameRange,
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
