import { DocumentSymbol, Range, SymbolKind, TextDocument } from 'vscode-languageserver';
import { ParsedSymbol, ParsedText, pb } from './PureBasicAPI';
import { ParsedSymbolRule, ParsedSymbolType, Test } from './PureBasicDataModels';

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
			if (/^(?:DeclareModule|Interface|Structure)$/gmi.exec(keyword)) {
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
			if (/^(?:EndProcedure|EndDeclareModule|EndInterface|EndStructure|EndImport)$/gmi.exec(keyword)) {
				pb.text.closeSymbol(parsedText, keyword, parsedText.lastIndex);
			}
		});
		return isSuccess;
	}

	private closeSymbol(parsedText: ParsedText, endKeyword: String, lastIndex: number) {
		if (parsedText.openedSymbol) {
			let openedSymbol = parsedText.openedSymbol;
			do {
				if (openedSymbol.rule.endKeyword === endKeyword) {
					openedSymbol.lastIndex = lastIndex;
					openedSymbol.docSymbol.detail = `(closed at ${lastIndex})`;
					openedSymbol.docSymbol.range.end = parsedText.doc.positionAt(lastIndex);
					pb.text.alignParentSymbolRangeTo(openedSymbol);
					parsedText.openedSymbol = openedSymbol.parent;
					break;
				}
			} while ((openedSymbol = openedSymbol.parent));
		}
	}



	private openSymbol(parsedText: ParsedText, rule: ParsedSymbolRule, name: string, startIndex: number, lastIndex: number) {
		let rg = Range.create(parsedText.doc.positionAt(startIndex), parsedText.doc.positionAt(lastIndex));
		let d = DocumentSymbol.create(name, '', rule.kind, rg, rg, []);
		let docSymbol = <Test>{
			...d
		};
		let parsedSymbol = <ParsedSymbol>{
			docSymbol: docSymbol,
			startIndex: startIndex,
			lastIndex: startIndex,
			rule: rule
		};
		if (parsedText.openedSymbol) {
			parsedSymbol.parent = parsedText.openedSymbol;
			parsedText.openedSymbol.docSymbol.children.push(parsedSymbol.docSymbol);
			parsedText.openedSymbol = parsedSymbol;
			pb.text.alignParentSymbolRangeTo(parsedSymbol);
		} else {
			parsedText.openedSymbol = parsedSymbol;
			parsedText.symbols.push(parsedSymbol);
		}
	}

	private alignParentSymbolRangeTo(openedSymbol: ParsedSymbol) {
		const endPos = openedSymbol.docSymbol.range.end;
		while ((openedSymbol = openedSymbol.parent)) {
			openedSymbol.docSymbol.range.end = endPos;
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