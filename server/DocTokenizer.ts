import { DocSymbolParser, DocSymbolToken } from './DocSymbolParsers';
import { DocumentSymbol, Position, Range, TextDocument } from 'vscode-languageserver';
import { ParsedSymbolSignature, ParsedText, pb } from './PureBasicAPI';

import { DocSymbol } from './DocSymbols';
import { DocSymbolType } from './DocSymbolType';

/**
 * Service for document code mapping
 */
export class DocTokenizer {
	/**
	 * Parsers used to detect any symbols based on text tokens
	 */
	private readonly SymbolParsers: DocSymbolParser[] = [
		new DocSymbolParser({
			openToken: /^DeclareModule$/i, type: DocSymbolType.Module,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndDeclareModule$/i
		}),
		new DocSymbolParser({
			openToken: /^Interface$/i, type: DocSymbolType.Interface,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndInterface$/i
		}),
		new DocSymbolParser({
			openToken: /^Procedure(C|CDLL|DLL)?$/i, type: DocSymbolType.Procedure,
			contentToken: DocSymbolToken.ReturnTypeName,
			closeToken: /^EndProcedure$/i
		}),
		new DocSymbolParser({
			openToken: /^Structure$/i, type: DocSymbolType.Structure,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndStructure$/i
		}),
		new DocSymbolParser({
			openToken: /^Import(C)?$/i, type: DocSymbolType.Import,
			contentToken: DocSymbolToken.Path,
			closeToken: /^EndImport$/i
		}),
		new DocSymbolParser({
			openToken: /^Macro$/i, type: DocSymbolType.Macro,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndMacro$/i
		}),
		new DocSymbolParser({
			openToken: /^Enumeration(Binary)?$/i, type: DocSymbolType.Enum,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndEnumeration$/i
		}),
		new DocSymbolParser({
			openToken: /^#.+?/, type: DocSymbolType.EnumMember,
			contentToken: DocSymbolToken.Name,
			parentType: DocSymbolType.Enum,
		}),
		new DocSymbolParser({
			openToken: /^#.+?/, type: DocSymbolType.Constant,
			contentToken: DocSymbolToken.Name,
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
			const parser = pb.text.SymbolParsers.find(p => p.openWith(word, parsedText.openedSymbols)) || pb.text.SymbolParsers.find(p => p.closeWith(word)) || DocSymbolParser.Unknown;
			const { isClosed, isClosing } = parser;
			if (isClosing) {
				pb.text.closeSymbol(parsedText, parser);
			} else if (isClosed) {
				const signature = pb.text.getSymbolSignature(parsedText, res, groups, true);
				pb.text.openSymbol(parsedText, parser, signature);
			} else if (parser !== DocSymbolParser.Unknown) {
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
	private openSymbol(parsedText: ParsedText, parser: DocSymbolParser, sign: ParsedSymbolSignature) {
		const docSymbol = DocumentSymbol.create(sign.name, '', parser.type.icon, sign.range, sign.selectionRange, []);
		const parsedSymbol = new DocSymbol({
			...docSymbol,
			nameRange: sign.nameRange,
			type: parser.type,
		});
		if (parsedText.openedSymbols.length > 0) {
			parsedText.openedSymbols[0].children.push(parsedSymbol);
			if (!parser.isClosed) { parsedText.openedSymbols.unshift(parsedSymbol); }
		} else {
			if (!parser.isClosed) { parsedText.openedSymbols.unshift(parsedSymbol); }
			parsedSymbol.isRootSymbol = true;
		}
		parsedText.symbols.push(parsedSymbol);
	}
	private closeSymbol(parsedText: ParsedText, parser: DocSymbolParser) {
		parsedText.openedSymbols.forEach((openedSymbol, index) => {
			if (openedSymbol.type === parser.type) {
				openedSymbol.detail = `(closed at ${parsedText.lastIndex})`;
				openedSymbol.range.end = parsedText.doc.positionAt(parsedText.lastIndex);
				pb.text.alignToClosingSymbol(parsedText, openedSymbol);
				parsedText.openedSymbols = parsedText.openedSymbols.splice(index + 1);
				return;
			}
		});
	}
	private alignToClosingSymbol(parsedText: ParsedText, lastSymbol: DocSymbol) {
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