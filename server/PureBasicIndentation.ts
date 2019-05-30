import { FormattingOptions, TextDocument } from 'vscode-languageserver';
import { IndentationContext, IndentationRule, ParsedLine } from './PureBasicDataModels';

import { LanguageSettings } from './services/LanguageSettings';
import { pb } from './PureBasicAPI';

export class PureBasicIndentation {
	private readonly INDENTATION_RULES: IndentationRule[] = [
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
	public async create(doc: TextDocument, options: FormattingOptions): Promise<IndentationContext> {
		const settings = await LanguageSettings.service.load(doc);
		const indentation = <IndentationContext>{
			current: 0,
			next: 0,
			options: options,
			indentRules: pb.indentation.INDENTATION_RULES.concat(settings.indentationRules),
			oneIndent: (options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'),
			tabSpaces: ' '.repeat(options.tabSize)
		};
		return indentation;
	}
	/**
	 * Update line indents according to words and indentating context
	 * @param parsedLine
	 * @param indentContext current indenting context
	 */
	public update(parsedLine: ParsedLine, indentContext: IndentationContext) {
		const { indentRules, oneIndent } = indentContext;
		// reset current indents
		if (indentContext.next < 0) indentContext.next = 0;
		indentContext.current = indentContext.next;
		// calculate current and next indents
		let isIndentingCurrentLine = true;
		this.selectIdentRules(parsedLine, indentRules).forEach(indentRule => {
			if (isIndentingCurrentLine) {
				if (indentRule.before) {
					indentContext.current += indentRule.before;
					indentContext.next = indentContext.current;
				}
				if (indentRule.after) {
					indentContext.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				indentContext.next += indentRule.before + indentRule.after;
			}
		});
		// apply current indents on current line
		if (indentContext.current < 0) indentContext.current = 0;
		parsedLine.indents = oneIndent.repeat(indentContext.current);
	}
	/**
	 * Pick line indents used for next indentation
	 * @param parsedLine
	 * @param indentContext current indenting context
	 * @returns True if line indentation is picked
	 */
	public pick(parsedLine: ParsedLine, indentContext: IndentationContext): boolean {
		const { indentRules, options, tabSpaces } = indentContext;
		let isIndentingCurrentLine = true;
		let isIndentContextPicked = false;
		indentContext.next = parsedLine.indents.replace(/\t/g, tabSpaces).length / options.tabSize;
		this.selectIdentRules(parsedLine, indentRules).forEach(indentRule => {
			isIndentContextPicked = true;
			if (isIndentingCurrentLine) {
				if (indentRule.after) {
					indentContext.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				indentContext.next += indentRule.before + indentRule.after;
			}
		});
		return isIndentContextPicked;
	}
	/**
	 * Select indentation rules to apply for each word or comment from line structure data
	 * @param parsedLine
	 * @param indentRules
	 */
	private selectIdentRules(parsedLine: ParsedLine, indentRules: IndentationRule[]): IndentationRule[] {
		return parsedLine.words.concat(parsedLine.comment)
			.map(word => indentRules.find(indentRule => word.match(indentRule.regex) != null))
			.filter(indentRule => indentRule);
	}
}