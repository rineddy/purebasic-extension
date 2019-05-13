import { ParsedLine, ParsedText, RegexReplaceRule, pb } from './PureBasicAPI';
import { Range, TextDocument } from 'vscode-languageserver';

export class PureBasicParser {
	/**
	 * Provides `Regexp` rules to capture substrings from line text
	 */
	private readonly LINE_WITH = {
		/**
		 * Finds indents and full content without optional line break characters
		 */
		INDENTS_FULLCONTENT: /^([\t ]*)(.*?)[\r\n]*$/,
		/**
		 * Finds words
		 * @example ' ( _Word123, $myWord, OtherW0rd$ | $someWord$ ) + 123'  -->  ['_Word123', '$myWord', 'OtherW0rd$', '$someWord$', '123']
		 */
		WORDS: /[$]?\b\w+\b[$]?/gi,
		/**
		 * Finds strings, comment and end spaces
		 */
		STRINGS_COMMENT_ENDSPACES: /(")(?:[^"\\]|\\.)*"?|(')[^']*'?|(;).*?(?=\s*$)|(\s)\s*$/g,
		/**
		 * Finds cut text without start spaces or line break characters
		 */
		CUTTEXT: /^[\t ]+(.*?)[\r\n]*$/
	};
	/**
	 * Provides `Regexp` rules to capture substrings from multiline text
	 */
	private readonly TEXT_WITH = {
		STRINGS: /"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?/gm,
		COMMENTS: /;.*?$/gm
	};

	/**
	 * Read document line to parse
	 * @param doc
	 * @param line line to read and parse
	 * @param lineCharacter line last character position ( or end of line position if 'undefined' )
	 */
	public parseLine(doc: TextDocument, line: number, lineCharacter?: number): ParsedLine {
		// reading
		const readRange = Range.create(line, 0, line, lineCharacter !== undefined ? lineCharacter : Number.MAX_SAFE_INTEGER);
		const cutRange = lineCharacter !== undefined ? Range.create(line, lineCharacter, line, Number.MAX_SAFE_INTEGER) : undefined;
		const readText = doc.getText(readRange);
		const cutText = cutRange ? doc.getText(cutRange) : undefined;
		// parsing
		let [, indents, fullContent] = readText.match(pb.parser.LINE_WITH.INDENTS_FULLCONTENT) || [, '', ''];
		let strings: string[] = [];
		let comment = '';
		let endSpaces = '';
		let content = fullContent.replace(pb.parser.LINE_WITH.STRINGS_COMMENT_ENDSPACES, (match: string, dquote: string, quote: string, semicolon: string, space: string) => {
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
			words: content.match(pb.parser.LINE_WITH.WORDS) || [],
			strings: strings,
			comment: comment,
			endSpaces: endSpaces,
			isBlank: content === '' && comment === ''
		};
	}
	/**
	 * Update parsed line data using `modifyLine` function
	 * @param parsedLine
	 * @param modifyLine
	 */
	public updateLine(parsedLine: ParsedLine, modifyLine: (parsedLine: ParsedLine) => void) {
		if (modifyLine) {
			modifyLine(parsedLine);
		}
		const { indents, content, strings, comment, endSpaces } = parsedLine;
		const newText = indents + content.replace(pb.parser.LINE_WITH.STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		parsedLine.newText = newText;
	}
	/**
	 * Trim spaces after cut
	 * @param parsedLine
	 * @example 'lineText|   cutText'  -->  'lineText|cutText'
	 */
	public trimAfterCutSpaces(parsedLine: ParsedLine) {
		let newCutText: string;
		if (parsedLine.cut && ([, newCutText] = parsedLine.cut.text.match(pb.parser.LINE_WITH.CUTTEXT))) {
			parsedLine.cut.newText = newCutText;
		}
	}
	/**
	 * Trim end spaces
	 * @param parsedLine
	 * @example 'lineText   '  -->  'lineText'
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
	 * @param rules array of replacement rules
	 */
	public beautify(parsedLine: ParsedLine, rules: RegexReplaceRule[]) {
		for (const rule of rules) {
			parsedLine.content = parsedLine.content.replace(rule[0], rule[1]);
		}
	}
	/**
	 * Read document text to parse
	 * @param doc
	 */
	public parseText(doc: TextDocument): ParsedText {
		const readText = doc.getText();
		return <ParsedText>{
			text: readText,
			comments: readText.capture(pb.parser.TEXT_WITH.COMMENTS) || [],
			strings: readText.capture(pb.parser.TEXT_WITH.STRINGS) || []
		};
	}
}