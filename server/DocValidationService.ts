import {
	Diagnostic,
	TextDocument
} from 'vscode-languageserver';

import { DocMap } from './DocMapService';
import { LanguageSettings } from './LanguageSettingsService';
import { pb } from './PureBasicAPI';

/**
 * Service for document validation
 */
export class DocValidation {
	public static service = new DocValidation();

	private constructor() { }

	public async validate(doc: TextDocument) {
		// get settings and doc symbols for every validate run.
		const settings = await LanguageSettings.service.load(doc);
		const symbols = await DocMap.service.load(doc);

		let diagnosticMax = settings.diagnostics.maxNumberOfProblems;
		let diagnostics: Diagnostic[] = symbols.map(s => s.type.validator.validate(s))
			.filter(d => d)
			.slice(0, diagnosticMax);

		// Send the computed diagnostics to VSCode.
		pb.connection.sendDiagnostics({ uri: doc.uri, diagnostics });
	}
}
