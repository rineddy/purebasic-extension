import { ICustomRegexReplacer, ParsedLine, pb } from './PureBasicAPI';
import { Range, TextDocument } from 'vscode-languageserver';

export class PureBasicParser {
	/**
	 *
	 * Extracts indents and full content without line break characters from line text
	 * @example let [match, indents, fullContent] = thisLineText.match(pb.text.EXTRACTS_INDENTS_FULLCONTENT)
	 */
	private readonly EXTRACTS_INDENTS_FULLCONTENT = /^([\t ]*)(.*?)[\r\n]*$/;
	/**
	 * Extracts words from text (ex: _Word123,$myWord,OtherW0rd$)
	 * @example let words = thisText.match(pb.text.EXTRACTS_WORDS)
	 */
	private readonly EXTRACTS_WORDS = /[$]?\b\w+\b[$]?/gi;
	/**
	 * Finds strings, comment and end spaces from line text
	 */
	private readonly FINDS_STRINGS_COMMENT_ENDSPACES = /(")(?:[^"\\]|\\.)*"?|(')[^']*'?|(;).*?(?=\s*$)|(\s)\s*$/g;
	/**
	 * Finds strings, comments from document text
	 */
	private readonly FINDS_STRINGS_COMMENTS = /"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?|;.*?$/gm;

	/**
	 * @param doc
	 * @param line line to read and parse
	 * @param lineCharacter line last character position ( or end of line position if 'undefined' )
	 */
	public readLine(doc: TextDocument, line: number, lineCharacter?: number): ParsedLine {
		// reading
		const readRange = Range.create(line, 0, line, lineCharacter !== undefined ? lineCharacter : Number.MAX_SAFE_INTEGER);
		const cutRange = lineCharacter !== undefined ? Range.create(line, lineCharacter, line, Number.MAX_SAFE_INTEGER) : undefined;
		const readText = doc.getText(readRange);
		const cutText = cutRange ? doc.getText(cutRange) : undefined;
		// parsing
		let [, indents, fullContent] = readText.match(pb.parser.EXTRACTS_INDENTS_FULLCONTENT) || [, '', ''];
		let strings: string[] = [];
		let comment = '';
		let endSpaces = '';
		let content = fullContent.replace(pb.parser.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string, dquote: string, quote: string, semicolon: string, space: string) => {
			if (semicolon) { comment = match; }
			else if (space) { endSpaces = match; }
			else { strings.push(match); }
			return (dquote + dquote) || (quote + quote) || semicolon || ''; // empty string or empty comment result
		});
		return <ParsedLine>{
			text: readText,
			newText: readText,
			range: readRange,
			cut: cutText ? {
				text: cutText,
				newText: cutText,
				range: cutRange
			} : undefined,
			indents: indents,
			content: content,
			words: content.match(pb.parser.EXTRACTS_WORDS) || [],
			strings: strings,
			comment: comment,
			endSpaces: endSpaces,
			isBlank: content === '' && comment === ''
		};
	}
	/**
	 * Retrieves line text after some structure data modifications
	 * @param doc
	 * @param line line to read and toparse
	 * @param lineCharacter line last character position ( or end of line position if 'undefined' )
	 */
	public updateLine(parsedLine: ParsedLine, modifyLine: (parsedLine: ParsedLine) => void) {
		if (modifyLine) {
			modifyLine(parsedLine);
		}
		const { indents, content, strings, comment, endSpaces } = parsedLine;
		const fullContent = content.replace(pb.parser.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		parsedLine.newText = indents + fullContent;
	}
	/**
	 * Trim spaces after cut
	 * @param parsedLine
	 * @example "lineText|   cutText"  -->  "lineText|cutText"
	 */
	public trimAfterCutSpaces(parsedLine: ParsedLine) {
		if (parsedLine.cut && parsedLine.cut.text.match(/^\s+/)) {
			parsedLine.cut.newText = parsedLine.cut.text.trimLeft();
		}
	}
	/**
	 * Trim end spaces
	 * @param parsedLine
	 * @example "lineText   "  -->  "lineText"
	 */
	public trimEndSpaces(parsedLine: ParsedLine) {
		if (parsedLine.isBlank) {
			parsedLine.indents = '';
		}
		else {
			parsedLine.endSpaces = '';
		}
	}
	/**
	 * Beautify line content by replacing substrings
	 * @param parsedLine
	 * @param replacers array of replacement rules
	 */
	public beautify(parsedLine: ParsedLine, replacers: ICustomRegexReplacer[]) {
		for (const replacer of replacers) {
			parsedLine.content = parsedLine.content.replace(replacer[0], replacer[1]);
		}
	}
	public simplify(text: string): string {
		const simplifiedText = text.replace(pb.parser.FINDS_STRINGS_COMMENTS, match => {
			return match.length > 1 ? match[0] + '-'.repeat(match.length - 2) + match[0] : match[0]; // simplified string or comment
		});
		return simplifiedText;
	}
}