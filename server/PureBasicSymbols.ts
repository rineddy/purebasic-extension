import {
	DocumentSymbol,
	DocumentSymbolParams,
	Position,
	Range,
	SymbolInformation,
	SymbolKind,
	TextDocument,
	WorkspaceSymbolParams
} from 'vscode-languageserver';

import { PureBasicParser } from './PureBasicParser';
import { pb } from './PureBasicAPI';

export class PureBasicSymbols {
	private readonly PARSING_RULES: { kind: SymbolKind, regex: RegExp }[] = [
		{
			kind: SymbolKind.Function,
			regex: pb.parser.declareBlock().withStartKeyword(['Procedure', 'ProcedureC', 'ProcedureDLL', 'ProcedureCDLL']).withOptionalType().andSpaces()
				.withName().withBody().withEndKeyword('EndProcedure').toRegex()
		}, {
			kind: SymbolKind.Interface,
			regex: pb.parser.declareBlock().withStartKeyword(['Interface']).andSpaces()
				.withName().withBody().withEndKeyword('EndInterface').toRegex()
		}, {
			kind: SymbolKind.Struct,
			regex: pb.parser.declareBlock().withStartKeyword(['Structure']).andSpaces()
				.withName().withBody().withEndKeyword('EndStructure').toRegex()
		}, {
			kind: SymbolKind.Enum,
			regex: pb.parser.declareBlock().withStartKeyword(['Enumeration', 'EnumerationBinary']).andSpaces()
				.withName().withBody().withEndKeyword('EndEnumeration').toRegex()
		}, {
			kind: SymbolKind.Module,
			regex: pb.parser.declareBlock().withStartKeyword(['DeclareModule']).andSpaces()
				.withName().withBody().withEndKeyword('EndDeclareModule').toRegex()
		}
	];

	/**
	 *
	 * @param params
	 */
	public async getDocumentSymbols(params: DocumentSymbolParams): Promise<DocumentSymbol[]> {
		const doc = await pb.documentation.find(params.textDocument);
		const text = doc.getText();
		const simplifiedText = pb.text.simplify(text);
		let symbols = [];
		pb.symbols.PARSING_RULES.forEach(parsingRule => {
			let regexResult: RegExpExecArray;
			while ((regexResult = parsingRule.regex.exec(simplifiedText)) !== null) {
				const result = pb.parser.parseResult(doc, regexResult);
				const symbol = DocumentSymbol.create(result.groups.name, '...', parsingRule.kind, result.ranges.block, result.ranges.name)
				symbols.push(symbol);
			}
		});
		/*let a = SymbolInformation.create('a', SymbolKind.Field, Range.create(14, 2, 14, 3), params.textDocument.uri),
			b = SymbolInformation.create('b', SymbolKind.Constant, Range.create(15, 2, 15, 3), params.textDocument.uri),
			zzz = SymbolInformation.create('zzz', SymbolKind.Property, Range.create(20, 2, 23, 3), params.textDocument.uri);
		*/
		return symbols;
	}
	/**
	 *
	 *
	 * @param params
	 */
	public getWorkspaceSymbols(params: WorkspaceSymbolParams): SymbolInformation[] {
		return [];
	}
}
