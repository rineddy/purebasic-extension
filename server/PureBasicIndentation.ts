import {
	FormattingOptions,
	TextDocument
} from 'vscode-languageserver';
import { ICustomIndentRule, ICustomIndenting, ICustomLineStruct, pb } from './PureBasicAPI';

export class PureBasicIndentation {
	private readonly INDENTATION_RULES: ICustomIndentRule[] = [
		{
			regex: /^(While|Repeat|ForEach|For|With|Structure|StructureUnion|Macro|Import|ImportC|Interface|Procedure|ProcedureDLL|ProcedureCDLL|ProcedureC|If|CompilerIf|DataSection|DeclareModule|Module|Enumeration|EnumerationBinary)$/i,
			before: 0, after: 1
		},
		{
			regex: /^(Wend|Until|ForEver|Next|EndWith|EndStructure|EndStructureUnion|EndMacro|EndImport|EndInterface|EndProcedure|EndIf|CompilerEndIf|EndDataSection|EndDeclareModule|EndModule|EndEnumeration)$/i,
			before: -1, after: 0
		},
		{
			regex: /^(Else|ElseIf|Case|Default|CompilerElse|CompilerElseIf|CompilerCase|CompilerDefault)$/i,
			before: -1, after: 1
		},
		{
			regex: /^(Select|CompilerSelect)$/i,
			before: 0, after: 2
		},
		{
			regex: /^(EndSelect|CompilerEndSelect)$/i,
			before: -2, after: 0
		},
	];

	/**
	 * create indenting context
	 * @param doc
	 * @param options
	 */
	public async create(doc: TextDocument, options: FormattingOptions): Promise<ICustomIndenting> {
		const settings = await pb.settings.load(doc);
		const indentation = <ICustomIndenting>{
			current: 0,
			next: 0,
			options: options,
			indentationRules: pb.indentation.INDENTATION_RULES.concat(settings.indentationRules),
			oneIndent: (options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'),
			tabSpaces: ' '.repeat(options.tabSize)
		};
		return indentation;
	}
	/**
	 * Update line indents according to words and indentating context
	 * @param lineStruct line structure to analyze
	 * @param indenting current indenting context
	 */
	public update(lineStruct: ICustomLineStruct, indenting: ICustomIndenting) {
		const { indentationRules, oneIndent } = indenting;
		// reset current indents
		if (indenting.next < 0) indenting.next = 0;
		indenting.current = indenting.next;
		// calculate current and next indents
		let isIndentingCurrentLine = true;
		this.searchIdentRules(lineStruct, indentationRules).forEach(indentRule => {
			if (isIndentingCurrentLine) {
				if (indentRule.before) {
					indenting.current += indentRule.before;
					indenting.next = indenting.current;
				}
				if (indentRule.after) {
					indenting.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				indenting.next += indentRule.before + indentRule.after;
			}
		});
		// apply current indents on current line
		if (indenting.current < 0) indenting.current = 0;
		lineStruct.indents = oneIndent.repeat(indenting.current);
	}
	/**
	 * Pick line indents used for next indentation
	 * @param lineStruct line structure to analyze
	 * @param indenting current indenting context
	 * @returns True if line indentation is picked
	 */
	public pick(lineStruct: ICustomLineStruct, indenting: ICustomIndenting): boolean {
		const { indentationRules, options, tabSpaces } = indenting;
		let isIndentingCurrentLine = true;
		let isIndentingPicked = false;
		indenting.next = lineStruct.indents.replace(/\t/g, tabSpaces).length / options.tabSize;
		this.searchIdentRules(lineStruct, indentationRules).forEach(indentRule => {
			isIndentingPicked = true;
			if (isIndentingCurrentLine) {
				if (indentRule.after) {
					indenting.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				indenting.next += indentRule.before + indentRule.after;
			}
		});
		return isIndentingPicked;
	}
	/**
	 * Search indentation rules to apply for each word or comment from line structure data
	 * @param lineStruct line structure to analyze
	 * @param indentationRules
	 */
	private searchIdentRules(lineStruct: ICustomLineStruct, indentationRules: ICustomIndentRule[]): ICustomIndentRule[] {
		return lineStruct.words.concat(lineStruct.comment).map(word => {
			return indentationRules.find(indentRule => word.match(indentRule.regex) != null);
		}).filter(r => r);
	}
}