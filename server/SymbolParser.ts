import { Diagnostic, DiagnosticSeverity, DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver';

import { ParsedText } from './PureBasicAPI';

/**
 * Represents kinds of parsed symbol (alias)
 */
export type SymbolType = { readonly icon?: SymbolKind; };
export const SymbolType = {
	Unknown: {},
	Module: { icon: SymbolKind.Module },
	Procedure: { icon: SymbolKind.Function },
	Macro: { icon: SymbolKind.Function },
	Interface: { icon: SymbolKind.Interface },
	Structure: { icon: SymbolKind.Struct },
	Enum: { icon: SymbolKind.Enum },
	EnumMember: { icon: SymbolKind.EnumMember },
	Constant: { icon: SymbolKind.Constant },
	Import: { icon: SymbolKind.Package },
};
/**
 * Provides all validators used to validate a symbol
 */
export class SymbolValidator {
	public rule: RegExp;
	public createDiagnostic: (symbol: ParsedSymbol) => Diagnostic;

	public static ValidIdentifier = new SymbolValidator({
		rule: /^[a-z_]\w*$/i, createDiagnostic: (s) => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1000', message: `The identifier name '${s.name}' contains some unexpected characters.`,
		}
	});
	public static ValidStringIdentifier = new SymbolValidator({
		rule: /^[a-z_]\w*[$]?$/i, createDiagnostic: (s) => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1001', message: `The identifier name '${s.name}' contains some unexpected characters.`,
		}
	});
	public static ValidConstantIdentifier = new SymbolValidator({
		rule: /^#[a-z_]\w*[$]?$/i, createDiagnostic: (s) => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1002', message: `The constant name '${s.name}' contains some unexpected characters.`,
		}
	});
	public static ValidString = new SymbolValidator({
		rule: /"(?:[^"\r\n\\]|\\.)*"/, createDiagnostic: (s) => <Diagnostic>{
			severity: DiagnosticSeverity.Error, range: s.nameRange,
			source: 'PB1003', message: `The string '${s.name}' is not well-formed.`,
		}
	});

	public constructor(init?: Partial<SymbolValidator>) {
		Object.assign(this, init);
	}

	public validate(symbol: ParsedSymbol) {
		const isValid = this.rule.test(symbol.name);
		if (!isValid) { symbol.validationDiagnostic = this.createDiagnostic(symbol); }
		return isValid;
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
 * Provides all tokens used to describe symbol
 */
export interface SymbolToken extends RegExp { }
export const SymbolToken = {
	ReturnTypeName: /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm,
	Name: /(?<beforeName>[ \t]+)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)/gm,
	String: /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*"?)/gm,
};
/**
 * Represents parsing methods used to detect any kind of symbol according to input tokens
 */
export class SymbolParser {
	public readonly parentType?: SymbolType;
	public readonly type: SymbolType;
	public readonly openToken: SymbolToken;
	public readonly contentToken?: SymbolToken;
	public readonly closeToken?: SymbolToken;
	public readonly validator?: SymbolValidator;
	public readonly isClosed: boolean;
	public isClosing: boolean;

	public static Unknown: SymbolParser = <SymbolParser>{ type: SymbolType.Unknown };

	public constructor(init?: Partial<SymbolParser>) {
		Object.assign(this, init);
		this.isClosed = (this.closeToken === undefined);
	}

	public openWith(word: string, parsedText: ParsedText) {
		this.isClosing = false;
		return this.openToken.test(word) && (!this.parentType || (parsedText.openedSymbols.length > 0 && this.parentType === parsedText.openedSymbols[0].parser.type));
	}

	public closeWith(word: string) {
		this.isClosing = true;
		return this.closeToken && this.closeToken.test(word);
	}
}
/**
 * Represents parsed symbol (with nested symbols)
 */
export class ParsedSymbol extends DocumentSymbol {
	public nameRange?: Range;
	public parser: SymbolParser;
	public isRootSymbol: boolean;
	public validationDiagnostic?: Diagnostic;

	public constructor(init?: Partial<ParsedSymbol>) {
		super();
		Object.assign(this, init);
	}

	public validate() {
		const isValid = this.parser.validator.validate(this);
		return isValid;
	}
}