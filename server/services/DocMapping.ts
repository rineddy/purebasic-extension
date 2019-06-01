import { ClosureStatus, DocSymbolToken, DocTokenParser } from '../helpers/DocTokenParser';
import { DocumentSymbolParams, SymbolInformation, TextDocument, WorkspaceSymbolParams } from 'vscode-languageserver';

import { DocHandling } from './DocHandling';
import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocToken } from './../models/DocToken';
import { DocTokenizer } from '../helpers/DocTokenizer';

/**
 * Service for document symbol mapping
 */
export class DocMapping {
	public static service = new DocMapping();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();
	private readonly parsers: DocTokenParser[] = [
		new DocTokenParser({
			openToken: /^DeclareModule$/i, type: DocSymbolType.Module,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndDeclareModule$/i
		}),
		new DocTokenParser({
			openToken: /^Interface$/i, type: DocSymbolType.Interface,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndInterface$/i
		}),
		new DocTokenParser({
			openToken: /^Procedure(C|CDLL|DLL)?$/i, type: DocSymbolType.Procedure,
			contentToken: DocSymbolToken.ReturnTypeName,
			closeToken: /^EndProcedure$/i
		}),
		new DocTokenParser({
			openToken: /^Structure$/i, type: DocSymbolType.Structure,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndStructure$/i
		}),
		new DocTokenParser({
			openToken: /^Import(C)?$/i, type: DocSymbolType.Import,
			contentToken: DocSymbolToken.Path,
			closeToken: /^EndImport$/i
		}),
		new DocTokenParser({
			openToken: /^Macro$/i, type: DocSymbolType.Macro,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndMacro$/i
		}),
		new DocTokenParser({
			openToken: /^Enumeration(Binary)?$/i, type: DocSymbolType.Enum,
			contentToken: DocSymbolToken.Name,
			closeToken: /^EndEnumeration$/i
		}),
		new DocTokenParser({
			openToken: /^#.+?/, type: DocSymbolType.EnumMember,
			contentToken: DocSymbolToken.Name,
			parentType: DocSymbolType.Enum,
		}),
		new DocTokenParser({
			openToken: /^#.+?/, type: DocSymbolType.Constant,
			contentToken: DocSymbolToken.Name,
		}),
	];

	private constructor() { }

	public async load(doc: TextDocument): Promise<DocSymbol[]> {
		const tokenizer = new DocTokenizer(doc);
		let symbols = [];
		for (const token of tokenizer.nextToken(/(?<beforeName>(?:^|:)[ \t]*)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm)) {
			const { index, groups: { beforeName } } = token;
			if (beforeName === undefined) continue;
			tokenizer.startIndex = index + beforeName.length;
			const { symbolToken, contentToken } = this.parsers.find(p => p.parse(token, tokenizer.openedSymbols)) || { symbolToken: <DocToken>{}, contentToken: undefined };
			const { type, closure } = symbolToken;
			if (closure === ClosureStatus.Closing) {
				tokenizer.closeSymbol(symbolToken);
			} else if (closure === ClosureStatus.Closed) {
				const signature = tokenizer.getSymbolSignature(token);
				tokenizer.openSymbol(symbolToken, signature);
			} else if (type !== undefined) {
				for (const token of tokenizer.siblingToken(contentToken, 1)) {
					const signature = tokenizer.getSymbolSignature(token);
					tokenizer.openSymbol(symbolToken, signature);
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
			const doc = await DocHandling.service.find(params.textDocument);
			await this.load(doc);
		}
		return this.cachedDocSymbols.get(params.textDocument.uri).filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
