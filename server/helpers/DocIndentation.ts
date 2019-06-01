import { FormattingOptions, TextDocument } from 'vscode-languageserver';

import { IndentationRule } from '../models/IndentationRule';
import { LineParser } from './LineParser';
import { PurebasicSettings } from '../models/PurebasicSettings';

export class DocIndentation {
	public readonly options: FormattingOptions;
	public readonly indentRules: IndentationRule[];
	public readonly oneIndent: string;
	public readonly tabSpaces: string;
	public current: number;
	public next: number;
	private readonly indentationRules: IndentationRule[] = [
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

	public constructor(doc: TextDocument, options: FormattingOptions, settings: PurebasicSettings) {
		Object.assign(this, {
			current: 0,
			next: 0,
			options: options,
			indentRules: this.indentationRules.concat(settings.indentationRules),
			oneIndent: (options.insertSpaces ? ' '.repeat(options.tabSize) : '\t'),
			tabSpaces: ' '.repeat(options.tabSize)
		});
	}

	public update(parsedLine: LineParser) {
		// reset current indents
		if (this.next < 0) this.next = 0;
		this.current = this.next;
		// calculate current and next indents
		let isIndentingCurrentLine = true;
		this.selectIdentRules(parsedLine, this.indentRules).forEach(indentRule => {
			if (isIndentingCurrentLine) {
				if (indentRule.before) {
					this.current += indentRule.before;
					this.next = this.current;
				}
				if (indentRule.after) {
					this.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				this.next += indentRule.before + indentRule.after;
			}
		});
		// apply current indents on current line
		if (this.current < 0) this.current = 0;
		parsedLine.indents = this.oneIndent.repeat(this.current);
	}
	public pick(parsedLine: LineParser): boolean {
		let isIndentingCurrentLine = true;
		let isIndentContextPicked = false;
		this.next = parsedLine.indents.replace(/\t/g, this.tabSpaces).length / this.options.tabSize;
		this.selectIdentRules(parsedLine, this.indentRules).forEach(indentRule => {
			isIndentContextPicked = true;
			if (isIndentingCurrentLine) {
				if (indentRule.after) {
					this.next += indentRule.after;
					isIndentingCurrentLine = false;
				}
			}
			else {
				this.next += indentRule.before + indentRule.after;
			}
		});
		return isIndentContextPicked;
	}
	private selectIdentRules(parsedLine: LineParser, indentRules: IndentationRule[]): IndentationRule[] {
		return parsedLine.words.concat(parsedLine.comment)
			.map(word => indentRules.find(indentRule => word.match(indentRule.regex) != null))
			.filter(indentRule => indentRule);
	}
}