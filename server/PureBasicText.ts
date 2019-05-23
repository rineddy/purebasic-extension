import { DocumentSymbol, Range, SymbolKind, TextDocument } from 'vscode-languageserver';
import { ParsedSymbol, ParsedText, pb } from './PureBasicAPI';
import { ParsedSymbolRule, ParsedSymbolType } from './PureBasicDataModels';

export class PureBasicText {
	/**
	 * Find strings or cut strings
	 */
	private readonly WITH_STRINGS = /"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?/gm;
	/**
	 * Find comments
	 */
	private readonly WITH_COMMENTS = /;.*?$/gm;
	/**
	 * Describes all symbol naming
	 */
	private readonly SIGNATURES = {
		NAME: /[ \t]+(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		TYPE_NAME: /(?:[ \t]*(?<type>\.\w+))?[ \t]+(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		PATH: /[ \t]+(?<name>"(?:[^"\r\n\\]|\\.)*")/gmi,
	};
	/**
	 * Describes all kinds of symbol
	 */
	private readonly SYMBOL_RULES: ParsedSymbolRule[] = [
		{
			startKeyword: /^declaremodule$/i, type: ParsedSymbolType.Module, kind: SymbolKind.Module,
			endKeyword: 'enddeclaremodule'
		},
		{
			startKeyword: /^interface$/i, type: ParsedSymbolType.Interface, kind: SymbolKind.Interface,
			endKeyword: 'endinterface'
		},
		{
			startKeyword: /^procedure(C)?$/i, type: ParsedSymbolType.Procedure, kind: SymbolKind.Function,
			endKeyword: 'endprocedure'
		},
		{
			startKeyword: /^structure$/i, type: ParsedSymbolType.Structure, kind: SymbolKind.Struct,
			endKeyword: 'endstructure'
		},
		{
			startKeyword: /^import$/i, type: ParsedSymbolType.Import, kind: SymbolKind.Package,
			endKeyword: 'endimport'
		},
		{
			startKeyword: /^macro$/i, type: ParsedSymbolType.Macro, kind: SymbolKind.Function,
			endKeyword: 'endmacro'
		},
		{
			startKeyword: /^enumeration(Binary)?$/i, type: ParsedSymbolType.Enumeration, kind: SymbolKind.Enum,
			endKeyword: 'endenumeration'
		},
		{ startKeyword: /^(?:EndProcedure|EndDeclareModule|EndInterface|EndStructure|EndImport|EndMacro|EndEnumeration)$/i, type: ParsedSymbolType.Closing },
	];

	/**
	 * Read document text to parse
	 * @param doc
	 */
	public parseText(doc: TextDocument): ParsedText {
		const readText = doc.getText();
		return <ParsedText>{
			doc: doc,
			text: readText,
			startIndex: 0,
			lastIndex: 0,
			openedSymbols: [],
			symbols: [],
			// comments: readText.capture(pb.text.WITH_COMMENTS) || [],
			// strings: readText.capture(pb.text.WITH_STRINGS) || []
		};
	}

	public nextSymbol(parsedText: ParsedText): boolean {
		let isSuccess = pb.text.startWith(parsedText, /(?:^|:)[\t ]*(?<word>[\w]+[$]?)/gmi, (res, groups) => {
			parsedText.startIndex = res.index;
			const word = groups.word;
			const rule = pb.text.SYMBOL_RULES.find(r => r.startKeyword.test(word));
			const type = rule ? rule.type : ParsedSymbolType.None;
			if (type & (ParsedSymbolType.Module | ParsedSymbolType.Interface | ParsedSymbolType.Structure | ParsedSymbolType.Macro | ParsedSymbolType.Enumeration)) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.NAME, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (type === ParsedSymbolType.Procedure) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.TYPE_NAME, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (type === ParsedSymbolType.Import) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.PATH, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (type === ParsedSymbolType.Closing) {
				pb.text.closeSymbol(parsedText, word, parsedText.lastIndex);
			}
		});
		return isSuccess;
	}

	private closeSymbol(parsedText: ParsedText, endKeyword: String, lastIndex: number) {
		parsedText.openedSymbols.forEach((openedSymbol, index) => {
			if (openedSymbol.rule.endKeyword === endKeyword) {
				openedSymbol.lastIndex = lastIndex;
				openedSymbol.detail = `(closed at ${lastIndex})`;
				openedSymbol.range.end = parsedText.doc.positionAt(lastIndex);
				pb.text.alignToLastSymbol(parsedText, openedSymbol);
				parsedText.openedSymbols = parsedText.openedSymbols.splice(index + 1);
				return;
			}
		});
	}

	private openSymbol(parsedText: ParsedText, rule: ParsedSymbolRule, name: string, startIndex: number, lastIndex: number) {
		const rg = Range.create(parsedText.doc.positionAt(startIndex), parsedText.doc.positionAt(lastIndex));
		const docSymbol = DocumentSymbol.create(name, '', rule.kind, rg, rg, []);
		const parsedSymbol = <ParsedSymbol>{
			...docSymbol,
			startIndex: startIndex,
			lastIndex: lastIndex,
			rule: rule,
		};
		if (parsedText.openedSymbols.length > 0) {
			parsedText.openedSymbols[0].children.push(parsedSymbol);
			parsedText.openedSymbols.unshift(parsedSymbol);
			pb.text.alignToLastSymbol(parsedText, parsedSymbol);
		} else {
			parsedText.openedSymbols.unshift(parsedSymbol);
			parsedText.symbols.push(parsedSymbol);
		}
	}

	private alignToLastSymbol(parsedText: ParsedText, lastSymbol: ParsedSymbol) {
		const endPos = lastSymbol.range.end;
		let parsedSymbol = parsedText.symbols[parsedText.symbols.length - 1];
		while (parsedSymbol !== lastSymbol) {
			parsedSymbol.range.end = endPos;
			parsedSymbol = <ParsedSymbol>parsedSymbol.children[parsedSymbol.children.length - 1];
		}
	}

	private startWith(parsedText: ParsedText, regex: RegExp, onSuccess: (res: RegExpExecArray, groups: { [key: string]: string }) => void): boolean {
		let isSuccess: boolean;
		regex.lastIndex = parsedText.lastIndex;
		const res = regex.exec(parsedText.text);
		if (res) {
			parsedText.lastIndex = regex.lastIndex;
			onSuccess(res, res['groups'] || {});
			isSuccess = true;
		} else {
			isSuccess = false;
		}
		return isSuccess;
	}

	private continueWith(parsedText: ParsedText, regex: RegExp, onSuccess: (res: RegExpExecArray, groups: { [key: string]: string }) => void): boolean {
		let isSuccess: boolean;
		regex.lastIndex = parsedText.lastIndex;
		const res = regex.exec(parsedText.text);
		if (res && res.index === parsedText.lastIndex) {
			parsedText.lastIndex = regex.lastIndex;
			onSuccess(res, res['groups'] || {});
			isSuccess = true;
		} else {
			isSuccess = false;
		}
		return isSuccess;
	}
}