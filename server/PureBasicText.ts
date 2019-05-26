import { DocumentSymbol, Position, Range, TextDocument } from 'vscode-languageserver';
import { ParsedSymbolSignature, ParsedText, pb } from './PureBasicAPI';
import { Symbol, SymbolParser, SymbolToken, SymbolType, SymbolValidator } from './SymbolParser';

export class PureBasicText {
	/**
	 * Parsers used to detect any symbols based on text tokens
	 */
	private readonly SymbolParsers: SymbolParser[] = [
		new SymbolParser({
			openToken: /^DeclareModule$/i, type: SymbolType.Module,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidIdentifier,
			closeToken: /^EndDeclareModule$/i
		}),
		new SymbolParser({
			openToken: /^Interface$/i, type: SymbolType.Interface,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidIdentifier,
			closeToken: /^EndInterface$/i
		}),
		new SymbolParser({
			openToken: /^Procedure(C|CDLL|DLL)?$/i, type: SymbolType.Procedure,
			contentToken: SymbolToken.ReturnTypeName, validator: SymbolValidator.ValidIdentifier,
			closeToken: /^EndProcedure$/i
		}),
		new SymbolParser({
			openToken: /^Structure$/i, type: SymbolType.Structure,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidIdentifier,
			closeToken: /^EndStructure$/i
		}),
		new SymbolParser({
			openToken: /^Import(C)?$/i, type: SymbolType.Import,
			contentToken: SymbolToken.String, validator: SymbolValidator.ValidString,
			closeToken: /^EndImport$/i
		}),
		new SymbolParser({
			openToken: /^Macro$/i, type: SymbolType.Macro,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidIdentifier,
			closeToken: /^EndMacro$/i
		}),
		new SymbolParser({
			openToken: /^Enumeration(Binary)?$/i, type: SymbolType.Enum,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidStringIdentifier,
			closeToken: /^EndEnumeration$/i
		}),
		new SymbolParser({
			openToken: /^#.+?/, type: SymbolType.EnumMember,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidConstantIdentifier,
			parentType: SymbolType.Enum,
		}),
		new SymbolParser({
			openToken: /^#.+?/, type: SymbolType.Constant,
			contentToken: SymbolToken.Name, validator: SymbolValidator.ValidConstantIdentifier,
		}),
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
		let isSuccess = pb.text.startWith(parsedText, /(?<beforeName>(?:^|:)[ \t]*)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm, (res, groups) => {
			if (/^["';]/.test(res[0])) return; // skip symbol for string or comment
			parsedText.startIndex = res.index + groups.beforeName.length;
			const word = groups.name;
			const parser = pb.text.SymbolParsers.find(p => p.openWith(word, parsedText)) || pb.text.SymbolParsers.find(p => p.closeWith(word)) || SymbolParser.Unknown;
			const { isClosed, isClosing } = parser;
			if (isClosing) {
				pb.text.closeSymbol(parsedText, parser);
			} else if (isClosed) {
				const signature = pb.text.getSymbolSignature(parsedText, res, groups, true);
				pb.text.openSymbol(parsedText, parser, signature);
			} else if (parser !== SymbolParser.Unknown) {
				pb.text.continueWith(parsedText, parser.contentToken, (res, groups) => {
					const signature = pb.text.getSymbolSignature(parsedText, res, groups);
					pb.text.openSymbol(parsedText, parser, signature);
				});
			}
		});
		return isSuccess;
	}

	private getSymbolSignature(parsedText: ParsedText, signatureRes: RegExpExecArray, signatureGroups: { [key: string]: string; }, isClosed?: boolean) {
		const name = signatureGroups.name;
		const returnType = signatureGroups.returnType;
		const startPos = parsedText.doc.positionAt(parsedText.startIndex);
		const lastPos = parsedText.doc.positionAt(parsedText.lastIndex);
		const beforeName = signatureGroups.beforeName;
		const nameStartPos = parsedText.doc.positionAt(signatureRes.index + beforeName.length);
		const nameLastPos = parsedText.doc.positionAt(signatureRes.index + beforeName.length + name.length);
		return <ParsedSymbolSignature>{
			name: name,
			returnType: returnType,
			range: Range.create(startPos, isClosed ? lastPos : parsedText.docLastPos),
			nameRange: Range.create(nameStartPos, nameLastPos),
			selectionRange: Range.create(startPos, lastPos),
		};
	}

	private openSymbol(parsedText: ParsedText, rule: SymbolParser, sign: ParsedSymbolSignature) {
		const docSymbol = DocumentSymbol.create(sign.name, '', rule.type.icon, sign.range, sign.selectionRange, []);
		const parsedSymbol = new Symbol({
			...docSymbol,
			nameRange: sign.nameRange,
			parser: rule,
		});
		if (parsedText.openedSymbols.length > 0) {
			parsedText.openedSymbols[0].children.push(parsedSymbol);
			if (!rule.isClosed) { parsedText.openedSymbols.unshift(parsedSymbol); }
		} else {
			if (!rule.isClosed) { parsedText.openedSymbols.unshift(parsedSymbol); }
			parsedSymbol.isRootSymbol = true;
		}
		parsedText.symbols.push(parsedSymbol);
	}

	private closeSymbol(parsedText: ParsedText, rule: SymbolParser) {
		parsedText.openedSymbols.forEach((openedSymbol, index) => {
			if (openedSymbol.parser === rule) {
				openedSymbol.detail = `(closed at ${parsedText.lastIndex})`;
				openedSymbol.range.end = parsedText.doc.positionAt(parsedText.lastIndex);
				pb.text.alignToClosingSymbol(parsedText, openedSymbol);
				parsedText.openedSymbols = parsedText.openedSymbols.splice(index + 1);
				return;
			}
		});
	}

	private alignToClosingSymbol(parsedText: ParsedText, lastSymbol: Symbol) {
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