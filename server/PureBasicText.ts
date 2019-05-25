import { DocumentSymbol, Position, Range, TextDocument } from 'vscode-languageserver';
import { ParsedSymbol, ParsedSymbolKind, ParsedSymbolRule, ParsedSymbolSignature, ParsedText, pb } from './PureBasicAPI';

export class PureBasicText {
	/**
	 * Describes all symbol naming
	 */
	private readonly SIGNATURES = {
		TYPE_NAME: /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		NAME: /(?<beforeName>[ \t]+)(?<name>[\w\u00C0-\u017F]+[$]?)/gmi,
		PATH: /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*")/gmi,
	};
	/**
	 * Describes all kinds of symbol
	 */
	private readonly SYMBOL_RULES: ParsedSymbolRule[] = [
		{
			startKeyword: /^DeclareModule$/i, kind: ParsedSymbolKind.Module,
			endKeyword: /^EndDeclareModule$/i
		},
		{
			startKeyword: /^Interface$/i, kind: ParsedSymbolKind.Interface,
			endKeyword: /^EndInterface$/i
		},
		{
			startKeyword: /^Procedure(C|CDLL|DLL)?$/i, kind: ParsedSymbolKind.Procedure,
			endKeyword: /^EndProcedure$/i
		},
		{
			startKeyword: /^Structure$/i, kind: ParsedSymbolKind.Structure,
			endKeyword: /^EndStructure$/i
		},
		{
			startKeyword: /^Import(C)?$/i, kind: ParsedSymbolKind.Import,
			endKeyword: /^EndImport$/i
		},
		{
			startKeyword: /^Macro$/i, kind: ParsedSymbolKind.Macro,
			endKeyword: /^EndMacro$/i
		},
		{
			startKeyword: /^Enumeration(Binary)?$/i, kind: ParsedSymbolKind.Enumeration,
			endKeyword: /^EndEnumeration$/i
		},
		{ startKeyword: /^(?:EndProcedure|EndDeclareModule|EndInterface|EndStructure|EndImport|EndMacro|EndEnumeration)$/i, kind: ParsedSymbolKind.Closing },
	];

	/**
	 * Read document text to parse
	 * @param doc
	 */
	public parseText(doc: TextDocument): ParsedText {
		const readText = doc.getText();
		return <ParsedText>{
			text: readText,
			doc: doc,
			docLastPos: Position.create(doc.lineCount, 0),
			startIndex: 0,
			lastIndex: 0,
			symbols: [],
			openedSymbols: [],
		};
	}

	public nextSymbol(parsedText: ParsedText): boolean {
		let isSuccess = pb.text.startWith(parsedText, /(?<beforeWord>(?:^|:)[\t ]*)(?<word>[\w]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm, (res, groups) => {
			if (/^["';]/.test(res[0])) return; // skip symbol for string or comment
			parsedText.startIndex = res.index + groups.beforeWord.length;
			const word = groups.word;
			const rule = pb.text.SYMBOL_RULES.find(r => r.startKeyword.test(word));
			const kind = rule ? rule.kind : ParsedSymbolKind.None;
			if (kind === ParsedSymbolKind.Closing) {
				pb.text.closeSymbol(parsedText, word, parsedText.lastIndex);
			} else if (kind === ParsedSymbolKind.Procedure) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.TYPE_NAME, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, rule, signature);
				});
			} else if (kind === ParsedSymbolKind.Import) {
				pb.text.continueWith(parsedText, pb.text.SIGNATURES.PATH, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, rule, signature);
				});
			} else if (kind !== ParsedSymbolKind.None) {
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
		const returnType = signatureGroups.returnType;
		const startPos = parsedText.doc.positionAt(parsedText.startIndex);
		const lastPos = parsedText.doc.positionAt(parsedText.lastIndex);
		const nameStartPos = parsedText.doc.positionAt(signatureRes.index + signatureGroups.beforeName.length);
		const nameLastPos = parsedText.doc.positionAt(signatureRes.index + signatureGroups.beforeName.length + signatureGroups.name.length);
		return <ParsedSymbolSignature>{
			name: name,
			returnType: returnType,
			range: Range.create(startPos, parsedText.docLastPos),
			nameRange: Range.create(nameStartPos, nameLastPos),
			selectionRange: Range.create(startPos, lastPos),
		};
	}

	private openSymbol(parsedText: ParsedText, rule: ParsedSymbolRule, sign: ParsedSymbolSignature) {
		const docSymbol = DocumentSymbol.create(sign.name, '', rule.kind.icon, sign.range, sign.selectionRange, []);
		const parsedSymbol = <ParsedSymbol>{
			...docSymbol,
			nameRange: sign.nameRange,
			rule: rule,
		};
		if (parsedText.openedSymbols.length > 0) {
			parsedText.openedSymbols[0].children.push(parsedSymbol);
			parsedText.openedSymbols.unshift(parsedSymbol);
		} else {
			parsedText.openedSymbols.unshift(parsedSymbol);
			parsedSymbol.isRootSymbol = true;
		}
		parsedText.symbols.push(parsedSymbol);
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