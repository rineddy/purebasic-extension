import { DocumentSymbolParams, SymbolInformation, TextDocument, WorkspaceSymbolParams } from 'vscode-languageserver';

import { DocSymbol } from '../models/DocSymbol';
import { DocSymbolParser } from '../helpers/DocSymbolParser';
import { DocTokenizer } from '../helpers/DocTokenizer';
import { pb } from '../PureBasicAPI';

/**
 * Service for document code mapping
 */
export class DocSymbolMap {
	public static service = new DocSymbolMap();
	private readonly cachedDocSymbols: Map<string, DocSymbol[]> = new Map();

	private constructor() { }

	public async load(doc: TextDocument): Promise<DocSymbol[]> {
		const tokenizer = new DocTokenizer(doc);
		let symbols = [];
		while (tokenizer.nextToken(/(?<beforeName>(?:^|:)[ \t]*)(?<name>[#]?[\w\u00C0-\u017F]+[$]?)|"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm, token => {
			const { index, groups } = token;
			tokenizer.startIndex = index + groups.beforeName.length;
			const word = groups.name;
			const parser = tokenizer.symbolParsers.find(p => p.openWith(word, tokenizer.openedSymbols)) || tokenizer.symbolParsers.find(p => p.closeWith(word)) || DocSymbolParser.Unknown;
			const { isClosed, isClosing } = parser;
			if (isClosing) {
				tokenizer.closeSymbol(parser);
			} else if (isClosed) {
				const signature = tokenizer.getSymbolSignature(token, true);
				tokenizer.openSymbol(parser, signature);
			} else if (parser !== DocSymbolParser.Unknown) {
				tokenizer.siblingToken(parser.contentToken, token => {
					const signature = tokenizer.getSymbolSignature(token);
					tokenizer.openSymbol(parser, signature);
				});
			}
		}));
		symbols = tokenizer.symbols;
		this.cachedDocSymbols.set(doc.uri, symbols);
		return Promise.resolve(symbols);
	}
	public delete(doc: TextDocument) {
		this.cachedDocSymbols.delete(doc.uri);
	}
	public async getDocSymbols(params: DocumentSymbolParams): Promise<DocSymbol[]> {
		let symbols: DocSymbol[];
		if (!this.cachedDocSymbols.has(params.textDocument.uri)) {
			const doc = await pb.documentation.find(params.textDocument);
			symbols = await this.load(doc);
		}
		else {
			symbols = this.cachedDocSymbols.get(params.textDocument.uri);
		}
		return symbols.filter(s => s.isRootSymbol);
	}
	public async getDocSymbolsFromWorkspace(params: WorkspaceSymbolParams): Promise<SymbolInformation[]> {
		// params.query
		return Promise.resolve([]);
	}
}
