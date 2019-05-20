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
	 * Describes all kinds of symbol
	 */
	private readonly SYMBOL_RULES: { [keyword: string]: ParsedSymbolRule; } = {
		declaremodule: { type: ParsedSymbolType.Module, kind: SymbolKind.Module, endKeyword: 'enddeclaremodule' },
		interface: { type: ParsedSymbolType.Interface, kind: SymbolKind.Interface, endKeyword: 'endinterface' },
		procedure: { type: ParsedSymbolType.Procedure, kind: SymbolKind.Function, endKeyword: 'endprocedure' },
		structure: { type: ParsedSymbolType.Structure, kind: SymbolKind.Struct, endKeyword: 'endstructure' },
		import: { type: ParsedSymbolType.Import, kind: SymbolKind.Package, endKeyword: 'endimport' },
		macro: { type: ParsedSymbolType.Macro, kind: SymbolKind.Function, endKeyword: 'endmacro' },
	};

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

	public nextStartWord(parsedText: ParsedText): boolean {
		let isSuccess = pb.text.continueWith(parsedText, /(?:^|:)[\t ]*(?<word>[\w]+[$]?)/gmi, (res, groups) => {
			parsedText.startIndex = res.index;
			const keyword = groups.word.toLowerCase();
			const rule = pb.text.SYMBOL_RULES[keyword];
			if (/^(?:Import)$/gmi.exec(keyword)) {
				pb.text.continueWith(parsedText, /[ \t]+(?<name>"(?:[^"\r\n\\]|\\.)*")/gmi, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (/^(?:DeclareModule|Interface|Structure|Macro)$/gmi.exec(keyword)) {
				pb.text.continueWith(parsedText, /[ \t]+(?<name>[\w\u00C0-\u017F]+[$]?)/gmi, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (/^(?:Procedure)$/gmi.exec(keyword)) {
				pb.text.continueWith(parsedText, /(?:[ \t]*(?<type>\.\w+))?[ \t]+(?<name>[\w\u00C0-\u017F]+[$]?)/gmi, (res, groups) => {
					const name = groups.name;
					pb.text.openSymbol(parsedText, rule, name, parsedText.startIndex, parsedText.lastIndex);
				});
			}
			if (/^(?:EndProcedure|EndDeclareModule|EndInterface|EndStructure|EndImport|EndMacro)$/gmi.exec(keyword)) {
				pb.text.closeSymbol(parsedText, keyword, parsedText.lastIndex);
			}
		});
		return isSuccess;
	}

	private closeSymbol(parsedText: ParsedText, endKeyword: String, lastIndex: number) {
		if (parsedText.openedSymbols) {
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
	}

	private openSymbol(parsedText: ParsedText, rule: ParsedSymbolRule, name: string, startIndex: number, lastIndex: number) {
		const rg = Range.create(parsedText.doc.positionAt(startIndex), parsedText.doc.positionAt(lastIndex));
		const docSymbol = DocumentSymbol.create(name, '', rule.kind, rg, rg, []);
		const parsedSymbol = <ParsedSymbol>{
			...docSymbol,
			startIndex: startIndex,
			lastIndex: startIndex,
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

	private continueWith(parsedText: ParsedText, regex: RegExp, onSuccess: (res: RegExpExecArray, groups: { [key: string]: string }) => void): boolean {
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
}