import { DocSymbolParser, DocSymbolToken } from '../helpers/DocSymbolParser';
import { DocumentSymbolParams, SymbolInformation, TextDocument, WorkspaceSymbolParams } from 'vscode-languageserver';

import { DocRegistering } from './DocRegistering';
import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocTokenizer } from '../helpers/DocTokenizer';

/**
 * Service for document code mapping
 */
export class DocMapping {
	public static service = new DocMapping();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();
	private readonly parsers: DocSymbolParser[] = [
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

	private constructor() { }

	public async load(doc: TextDocument): Promise<DocSymbol[]> {
		const tokenizer = new DocTokenizer(doc);
		let symbols = [];
		for (const token of tokenizer.nextToken(/(?<beforeName>(?:^|:)[ \t]*)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm)) {
			const { index, groups: { name, beforeName } } = token;
			tokenizer.startIndex = index + beforeName.length;
			const parser = this.parsers.find(p => p.openWith(name, tokenizer.openedSymbols)) || this.parsers.find(p => p.closeWith(name)) || DocSymbolParser.Unknown;
			const { isClosed, isClosing } = parser;
			if (isClosing) {
				tokenizer.closeSymbol(parser);
			} else if (isClosed) {
				const signature = tokenizer.getSymbolSignature(token, true);
				tokenizer.openSymbol(parser, signature);
			} else if (parser !== DocSymbolParser.Unknown) {
				for (const token of tokenizer.siblingToken(parser.contentToken, 1)) {
					const signature = tokenizer.getSymbolSignature(token);
					tokenizer.openSymbol(parser, signature);
				}
			}
		}
		symbols = tokenizer.symbols;
		this.cachedDocSymbols.set(doc.uri, symbols);
		return Promise.resolve(symbols);
	}
	public delete(doc: TextDocument) {
		this.cachedDocSymbols.delete(doc.uri);
	}
	public async getDocSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		if (!this.cachedDocSymbols.has(params.textDocument.uri)) {
			const doc = await DocRegistering.service.find(params.textDocument);
			await this.load(doc);
		}
		return this.cachedDocSymbols.get(params.textDocument.uri).filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
