import { DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams, FormattingOptions, TextDocument, TextEdit } from 'vscode-languageserver';
import { BeautificationRule } from './models';
import { DocIndentation, LineParser } from './helpers';
import { DocHandler } from './DocHandler';
import { DocSettings } from './DocSettings';

/**
 * Service for doc text formatting
 */
export class DocFormatter {
	public static instance = new DocFormatter();
	private readonly beautificationRules: BeautificationRule[] = [
		[/\s+/g, ' '],
		[/\s+(,)/g, '$1'],
		[/(,)(?=\S)/g, '$1 '],
		[/\s+(\.|\\)/g, '$1'],
		[/(\.|\\)\s+/g, '$1'],
		[/\s+(::)/g, '$1'],
		[/(::)\s+/g, '$1'],
		[/\s+([})\]])/g, '$1'],
		[/([{([])\s+/g, '$1'],
		[/([^\s><=])(?=<>|<=|>=|=>|>=|=|<|>)/g, '$1 '],
		[/(<>|<=|>=|=>|>=|=|<|>)(?=[^\s><=])/g, '$1 '],
		[/(\S)(?=\/|<<|>>|\+|\|)/g, '$1 '],
		[/(\/|<<|>>|\+|\|)(?=\S)/g, '$1 '],
		[/([^\s:])(?=:[^:])/g, '$1 '],
		[/([^:]:)(?=[^\s:])/g, '$1 '],
	];

	private constructor() { }

	public async formatAll(formatting: DocumentFormattingParams): Promise<TextEdit[]> {
		const doc = await DocHandler.instance.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, 0, doc.lineCount - 1);
	}
	public async formatRange(formatting: DocumentRangeFormattingParams): Promise<TextEdit[]> {
		const doc = await DocHandler.instance.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, formatting.range.start.line, formatting.range.end.line, formatting.range.end.character);
	}
	public async formatOnType(formatting: DocumentOnTypeFormattingParams): Promise<TextEdit[]> {
		const doc = await DocHandler.instance.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, formatting.position.line - 1, formatting.position.line, formatting.position.character);
	}
	private async formatLineByLine(doc: TextDocument, options: FormattingOptions, startLine: number, endLine: number, endLineCharacter?: number): Promise<TextEdit[]> {
		const textEdits: TextEdit[] = [];
		const settings = await DocSettings.instance.load(doc);
		const indentation = new DocIndentation(doc, options, settings);
		for (let line = startLine - 1; line >= 0; line--) {
			const parsedLine = new LineParser(doc, line);
			if (indentation.pick(parsedLine)) {
				break;
			}
		}
		for (let line = startLine; line <= endLine; line++) {
			const parsedLine = new LineParser(doc, line, line === endLine ? endLineCharacter : undefined);
			parsedLine.updateLine(parsedLine => {
				indentation.update(parsedLine);
				parsedLine.beautify(this.beautificationRules);
				if (parsedLine.cut) {
					if (parsedLine.isBlank) { parsedLine.trimAfterCutSpaces(); }
				}
				else {
					parsedLine.trimEndSpaces();
				}
			});
			if (parsedLine.newText !== parsedLine.text) {
				textEdits.push(TextEdit.replace(parsedLine.range, parsedLine.newText));
			}
			if (parsedLine.cut && parsedLine.cut.newText !== parsedLine.cut.text) {
				textEdits.push(TextEdit.replace(parsedLine.cut.range, parsedLine.cut.newText));
			}
		}
		return textEdits;
	}
}