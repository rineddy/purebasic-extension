import { DocumentSymbol, Position, Range, SymbolKind, TextDocument } from 'vscode-languageserver';
import { ParsedSymbol, ParsedText, pb } from './PureBasicAPI';
import { ParsedSymbolRule, ParsedSymbolSignature, ParsedSymbolType } from './PureBasicDataModels';

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
		TYPE_NAME: /(?<beforeName>(?:[ \t]*(?<type>\.\w+))?[ \t]+)(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		NAME: /(?<beforeName>[ \t]+)(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		PATH: /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*")/gmi,
	};
	/**
	 * Describes all kinds of symbol
	 */
	private readonly SYMBOL_RULES: ParsedSymbolRule[] = [
		{
			startKeyword: /^DeclareModule$/i, type: ParsedSymbolType.Module, kind: SymbolKind.Module,
			endKeyword: /^EndDeclareModule$/i
		},
		{
			startKeyword: /^Interface$/i, type: ParsedSymbolType.Interface, kind: SymbolKind.Interface,
			endKeyword: /^EndInterface$/i
		},
		{
			startKeyword: /^Procedure(C|CDLL|DLL)?$/i, type: ParsedSymbolType.Procedure, kind: SymbolKind.Function,
			endKeyword: /^EndProcedure$/i
		},
		{
			startKeyword: /^Structure$/i, type: ParsedSymbolType.Structure, kind: SymbolKind.Struct,
			endKeyword: /^EndStructure$/i
		},
		{
			startKeyword: /^Import(C)?$/i, type: ParsedSymbolType.Import, kind: SymbolKind.Package,
			endKeyword: /^EndImport$/i
		},
		{
			startKeyword: /^Macro$/i, type: ParsedSymbolType.Macro, kind: SymbolKind.Function,
			endKeyword: /^EndMacro$/i
		},
		{
			startKeyword: /^Enumeration(Binary)?$/i, type: ParsedSymbolType.Enumeration, kind: SymbolKind.Enum,
			endKeyword: /^EndEnumeration$/i
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
		let isSuccess = pb.text.startWith(parsedText, /(?<beforeWord>(?:^|:)[\t ]*)(?<word>[\w]+[$]?)/gmi, (res, groups) => {
			parsedText.startIndex = res.index + groups.beforeWord.length;
			const word = groups.word;
			const rule = pb.text.SYMBOL_RULES.find(r => r.startKeyword.test(word));
			const type = rule ? rule.type : ParsedSymbolType.None;
			if (type === ParsedSymbolType.Closing) {
				pb.text.closeSymbol(parsedText, word, parsedText.lastIndex);
			} else if (type === ParsedSymbolType.Procedure) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.TYPE_NAME, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, rule, signature);
				});
			} else if (type === ParsedSymbolType.Import) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.PATH, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, rule, signature);
				});
			} else if (type !== ParsedSymbolType.None) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.NAME, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, rule, signature);
				});
			}
		});
		return isSuccess;
	}

	private getSymbolSignature(parsedText: ParsedText, signatureRes: RegExpExecArray, signatureGroups: { [key: string]: string; }) {
		const name = signatureGroups.name;
		const type = signatureGroups.type;
		const startPos = parsedText.doc.positionAt(parsedText.startIndex);
		const lastPos = parsedText.doc.positionAt(parsedText.lastIndex);
		const nameStartPos = parsedText.doc.positionAt(signatureRes.index + signatureGroups.beforeName.length);
		const nameLastPos = parsedText.doc.positionAt(signatureRes.index + signatureGroups.beforeName.length + signatureGroups.name.length);
		return <ParsedSymbolSignature>{
			name: name,
			type: type,
			rg: Range.create(startPos, Position.create(parsedText.doc.lineCount, 0)),
			rgSelection: Range.create(startPos, lastPos),
			rgName: Range.create(nameStartPos, nameLastPos),
		};
	}

	private openSymbol(parsedText: ParsedText, rule: ParsedSymbolRule, sign: ParsedSymbolSignature) {
		const docSymbol = DocumentSymbol.create(sign.name, '', rule.kind, sign.rg, sign.rgSelection, []);
		const parsedSymbol = <ParsedSymbol>{
			...docSymbol,
			nameRange: sign.rgName,
			rule: rule,
		};
		if (parsedText.openedSymbols.length > 0) {
			parsedText.openedSymbols[0].children.push(parsedSymbol);
			parsedText.openedSymbols.unshift(parsedSymbol);
		} else {
			parsedText.openedSymbols.unshift(parsedSymbol);
			parsedText.symbols.push(parsedSymbol);
		}
	}

	private closeSymbol(parsedText: ParsedText, endKeyword: string, lastIndex: number) {
		parsedText.openedSymbols.forEach((openedSymbol, index) => {
			if (openedSymbol.rule.endKeyword.test(endKeyword)) {
				openedSymbol.detail = `(closed at ${lastIndex})`;
				openedSymbol.range.end = parsedText.doc.positionAt(lastIndex);
				pb.text.alignToClosingSymbol(parsedText, openedSymbol);
				parsedText.openedSymbols = parsedText.openedSymbols.splice(index + 1);
				return;
			}
		});
	}

	private alignToClosingSymbol(parsedText: ParsedText, lastSymbol: ParsedSymbol) {
		const endPos = lastSymbol.range.end;
		for (const openedSymbol of parsedText.openedSymbols) {
			if (openedSymbol === lastSymbol) break;
			openedSymbol.range.end = endPos;
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