import {
	Diagnostic,
	DiagnosticSeverity,
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

		symbols.filter(s => !s.parser.validNameToken.test(s.name))
			.slice(0, maxProblems)
			.forEach(s => {
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
