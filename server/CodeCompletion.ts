import { CompletionItem, CompletionItemKind, TextDocumentPositionParams } from 'vscode-languageserver';

/**
 * Service for code completion
 */
export class CodeCompletion {
	public static instance = new CodeCompletion();

	private constructor() { }

	public getCompletionItems(txtDocPositionParams: TextDocumentPositionParams): CompletionItem[] {
		// The pass parameter contains the position of the text document in
		// which code complete got requested. For the example we ignore this
		// info and always provide the same completion items.
		return [
			{
				label: 'Procedure',
				kind: CompletionItemKind.Keyword,
				data: 1
			},
			{
				label: 'EndProcedure',
				kind: CompletionItemKind.Keyword,
				data: 2
			}
		];
	}
	public getCompletionDescription(item: CompletionItem): CompletionItem {
		if (item.data === 1) {
			(item.detail = 'Procedure details'),
				(item.documentation = 'Procedure documentation');
		} else if (item.data === 2) {
			(item.detail = 'EndProcedure details'),
				(item.documentation = 'EndProcedure documentation');
		}
		return item;
	}
}
