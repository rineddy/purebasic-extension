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
		const rg = Range.create(line, 0, line, lineCharacter !== undefined ? lineCharacter : Number.MAX_SAFE_INTEGER);
		const rgCut = lineCharacter !== undefined ? Range.create(line, lineCharacter, line, Number.MAX_SAFE_INTEGER) : undefined;
		const text = doc.getText(rg);
		const textCut = rgCut ? doc.getText(rgCut) : undefined;
		// parsing
		let [, indents, fullContent] = text.match(pb.parser.EXTRACTS_INDENTS_FULLCONTENT) || [, '', ''];
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
			read: { text: text, newText: text, range: rg },
			cut: textCut ? { text: textCut, newText: textCut, range: rgCut } : undefined,
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
		const lineText = indents + content.replace(pb.parser.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		parsedLine.read.newText = lineText;
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
	/**
	 * Trim end line spaces
	 * @param parsedLine
	 */
	public trimEnd(parsedLine: ParsedLine) {
		if (parsedLine.cut) {
			if (parsedLine.isBlank && parsedLine.cut.text.match(/^\s+/)) {
				const cutText = parsedLine.cut.text.trimLeft();
				parsedLine.cut.newText = cutText;
			}
		}
		else {
			if (parsedLine.isBlank) {
				parsedLine.indents = '';
			}
			else {
				parsedLine.endSpaces = '';
			}
		}
	}
	public simplify(text: string): string {
		const simplifiedText = text.replace(pb.parser.FINDS_STRINGS_COMMENTS, match => {
			return match.length > 1 ? match[0] + '-'.repeat(match.length - 2) + match[0] : match[0]; // simplified string or comment
		});
		return simplifiedText;
	}
}