import { DocumentFormattingParams, DocumentOnTypeFormattingParams, DocumentRangeFormattingParams, FormattingOptions, TextDocument, TextEdit } from 'vscode-languageserver';

import { ClientSettings } from './ClientSettings';
import { DocCollection } from './DocCollection';
import { DocIndentation } from './../helpers/DocIndentation';
import { RegexReplaceRule } from '../PureBasicDataModels';
import { pb } from '../PureBasicAPI';

/**
 * Service for code formatting
 */
export class DocFormatting {
	public static service = new DocFormatting();
	private readonly beautificationRules: RegexReplaceRule[] = [
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
		const doc = await DocCollection.service.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, 0, doc.lineCount - 1);
	}
	public async formatRange(formatting: DocumentRangeFormattingParams): Promise<TextEdit[]> {
		const doc = await DocCollection.service.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, formatting.range.start.line, formatting.range.end.line, formatting.range.end.character);
	}
	public async formatOnType(formatting: DocumentOnTypeFormattingParams): Promise<TextEdit[]> {
		const doc = await DocCollection.service.find(formatting.textDocument);
		return this.formatLineByLine(doc, formatting.options, formatting.position.line - 1, formatting.position.line, formatting.position.character);
	}
	private async formatLineByLine(doc: TextDocument, options: FormattingOptions, startLine: number, endLine: number, endLineCharacter?: number): Promise<TextEdit[]> {
		const textEdits: TextEdit[] = [];
		const settings = await ClientSettings.service.load(doc);
		const indentation = new DocIndentation(doc, options, settings);
		for (let line = startLine - 1; line >= 0; line--) {
			const parsedLine = pb.line.parseLine(doc, line);
			if (indentation.pick(parsedLine)) {
				break;
			}
		}
		for (let line = startLine; line <= endLine; line++) {
			const parsedLine = pb.line.parseLine(doc, line, line === endLine ? endLineCharacter : undefined);
			pb.line.updateLine(parsedLine, parsedLine => {
				indentation.update(parsedLine);
				pb.line.beautify(parsedLine, this.beautificationRules);
				if (parsedLine.cut) {
					if (parsedLine.isBlank) { pb.line.trimAfterCutSpaces(parsedLine); }
				}
				else {
					pb.line.trimEndSpaces(parsedLine);
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