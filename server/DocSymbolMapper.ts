import { TextDocument, DocumentSymbolParams, WorkspaceSymbolParams, SymbolInformation } from 'vscode-languageserver';
import { DocSymbol, DocSymbolType, DocTokenRegex, ParsingContext } from './models';
import { DocTokenParser, DocTokenizer } from './helpers';
import { DocHandler } from './DocHandler';


/**
 * Service for document symbol mapping
 */
export class DocSymbolMapper {
	public static instance = new DocSymbolMapper();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();
	private readonly parsers: DocTokenParser[] = [
		new DocTokenParser({
			openRegex: /^DeclareModule$/i, type: DocSymbolType.DeclareModule,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndDeclareModule$/i
		}),
		new DocTokenParser({
			openRegex: /^Module$/i, type: DocSymbolType.Module,
			contentRegex: DocTokenRegex.Name,
			closeRegex: /^EndModule$/i
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
			openRegex: /^(Map|List|Array)$/, type: DocSymbolType.Field,
			contentRegex: DocTokenRegex.Name,
			parentType: DocSymbolType.Structure,
		}),
		new DocTokenParser({
			openRegex: /^[*]?.+?/, type: DocSymbolType.Field,
			parentType: DocSymbolType.Structure,
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
			parentType: DocSymbolType.Enum,
		}),
		new DocTokenParser({
			openRegex: /^#.+?/, type: DocSymbolType.Constant,
		}),
	];

	private constructor() { }

	public async load(doc: TextDocument): Promise<DocSymbol[]> {
		const tokenizer = new DocTokenizer(doc);
		const context = <ParsingContext>{ symbols: [], openedSymbols: [], tokenizer };
		for (const token of tokenizer.nextToken(/(?<beforeName>(?:^|:)[ \t]*)(?<name>[#*]?[\w\u00C0-\u017F]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm)) {
			const { index, groups: { beforeName } } = token;
			if (beforeName === undefined) continue;
			token.startIndex = index + beforeName.length;
			this.parsers.some(p => p.parse(token, context));
		}
		this.cachedDocSymbols.set(doc.uri, context.symbols);
		return Promise.resolve(context.symbols);
	}
	public delete(doc: TextDocument) {
		this.cachedDocSymbols.delete(doc.uri);
	}
	public async getDocSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		if (!this.cachedDocSymbols.has(params.textDocument.uri)) {
			const doc = await DocHandler.instance.find(params.textDocument);
			await this.load(doc);
		}
		return this.cachedDocSymbols.get(params.textDocument.uri).filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
