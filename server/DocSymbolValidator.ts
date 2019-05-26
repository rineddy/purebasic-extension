import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';

import { DocSymbol } from './DocSymbols';

/**
 * Describes how to validate document symbol
 */
class DocSymbolValidationRule {
	public isValidSymbol: (symbol: DocSymbol) => boolean;
	public createDiagnostic: (symbol: DocSymbol) => Diagnostic;

	public constructor(init?: Partial<DocSymbolValidationRule>) {
		Object.assign(this, init);
	}

	public validate(symbol: DocSymbol): Diagnostic {
		return this.isValidSymbol(symbol) ? undefined : this.createDiagnostic(symbol);
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
	}
}
/**
 * Validator of document symbol
 */
export namespace DocSymbolValidator {
	export const ValidName = new DocSymbolValidationRule({
		isValidSymbol: s => /^[a-z_]\w*$/i.test(s.name),
		createDiagnostic: s => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1000', message: `The identifier name '${s.name}' contains some unexpected characters.`,
		}
	});
	export const ValidName$ = new DocSymbolValidationRule({
		isValidSymbol: s => /^[a-z_]\w*[$]?$/i.test(s.name),
		createDiagnostic: s => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1001', message: `The identifier name '${s.name}' contains some unexpected characters.`,
		}
	});
	export const ValidConstantName$ = new DocSymbolValidationRule({
		isValidSymbol: s => /^#[a-z_]\w*[$]?$/i.test(s.name),
		createDiagnostic: s => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1002', message: `The constant name '${s.name}' contains some unexpected characters.`,
		}
	});
	export const ValidString = new DocSymbolValidationRule({
		isValidSymbol: s => /"(?:[^"\r\n\\]|\\.)*"/.test(s.name),
		createDiagnostic: s => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1003', message: `The string '${s.name}' is not well-formed.`,
		}
	});
}
export type DocSymbolValidator = DocSymbolValidationRule;
