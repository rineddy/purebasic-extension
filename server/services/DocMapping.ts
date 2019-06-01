import { DocumentSymbolParams, SymbolInformation, TextDocument, WorkspaceSymbolParams } from 'vscode-languageserver';

import { ClosureStatus } from '../models/ClosureStatus';
import { DocHandling } from './DocHandling';
import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolType } from '../models/DocSymbolType';
import { DocToken } from './../models/DocToken';
import { DocTokenParser } from '../helpers/DocTokenParser';
import { DocTokenRegex } from '../models/DocTokenRegex';
import { DocTokenizer } from '../helpers/DocTokenizer';

/**
 * Service for document symbol mapping
 */
export class DocMapping {
	public static service = new DocMapping();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();
	private readonly parsers: DocTokenParser[] = [
		new DocTokenParser({
			openRegex: /^DeclareModule$/i, type: DocSymbolType.Module,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndDeclareModule$/i
		}),
		new DocTokenParser({
			openRegex: /^Interface$/i, type: DocSymbolType.Interface,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndInterface$/i
		}),
		new DocTokenParser({
			openRegex: /^Procedure(C|CDLL|DLL)?$/i, type: DocSymbolType.Procedure,
			contentRegex: DocTokenRegex.ReturnTypeName,
			closeRegex: /^EndProcedure$/i
		}),
		new DocTokenParser({
			openRegex: /^Structure$/i, type: DocSymbolType.Structure,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndStructure$/i
		}),
		new DocTokenParser({
			openRegex: /^Import(C)?$/i, type: DocSymbolType.Import,
			contentRegex: DocTokenRegex.Path,
			closeRegex: /^EndImport$/i
		}),
		new DocTokenParser({
			openRegex: /^Macro$/i, type: DocSymbolType.Macro,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndMacro$/i
		}),
		new DocTokenParser({
			openRegex: /^Enumeration(Binary)?$/i, type: DocSymbolType.Enum,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndEnumeration$/i
		}),
		new DocTokenParser({
			openRegex: /^#.+?/, type: DocSymbolType.EnumMember,
			contentRegex: DocTokenRegex.Name,
			parentType: DocSymbolType.Enum,
		}),
		new DocTokenParser({
			openRegex: /^#.+?/, type: DocSymbolType.Constant,
			contentRegex: DocTokenRegex.Name,
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
			const { symbolToken, contentRegex } = this.parsers.find(p => p.parse(token, tokenizer.openedSymbols)) || <DocTokenParser>{ symbolToken: <DocToken>{}, contentRegex: undefined };
			if (symbolToken.closure === ClosureStatus.Closing) {
				tokenizer.closeSymbol(symbolToken);
			} else if (symbolToken.closure === ClosureStatus.Closed) {
				tokenizer.openSymbol(symbolToken);
			} else if (symbolToken.type) {
				for (const token of tokenizer.siblingToken(contentRegex, 1)) {
					tokenizer.openSymbol(symbolToken);
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
