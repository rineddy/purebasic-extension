import { Range, TextDocument } from 'vscode-languageserver';

import { RegexReplaceRule } from '../PureBasicDataModels';

export class LineParser {
	public newText: string;
	public readonly text: string;
	public readonly range: Range;
	public readonly cut?: {
		newText: string;
		readonly text: string;
		readonly range: Range;
	};
	public readonly isBlank: boolean;
	public readonly words: string[];
	public readonly strings: string[];
	public indents: string;
	public content: string;
	public comment: string;
	public endSpaces: string;

	/**
	 * Extracts indents and full content without any line break characters
	 */
	private readonly WITH_INDENTS_FULLCONTENT = /^([\t ]*)(.*?)[\r\n]*$/;
	/**
	 * Extracts words
	 * @example ' ( _Word123, $myWord, OtherW0rd$ | $someWord$ ) + 123'  -->  ['_Word123', '$myWord', 'OtherW0rd$', '$someWord$', '123']
	 */
	private readonly WITH_WORDS = /[$]?\b\w+\b[$]?/gi;
	/**
	 * Finds strings, comment and end spaces
	 */
	private readonly WITH_STRINGS_COMMENT_ENDSPACES = /(")(?:[^"\\]|\\.)*"?|(')[^']*'?|(;).*?(?=\s*$)|(\s)\s*$/g;
	/**
	 * Extracts cut text without start spaces and any line break characters
	 */
	private readonly WITH_CUTTEXT = /^[\t ]+(.*?)[\r\n]*$/;

	public constructor(doc: TextDocument, line: number, lineCharacter?: number) {
		// reading
		const readRange = Range.create(line, 0, line, lineCharacter !== undefined ? lineCharacter : Number.MAX_SAFE_INTEGER);
		const cutRange = lineCharacter !== undefined ? Range.create(line, lineCharacter, line, Number.MAX_SAFE_INTEGER) : undefined;
		const readText = doc.getText(readRange);
		const cutText = cutRange ? doc.getText(cutRange) : undefined;
		// parsing
		let [, indents, fullContent] = readText.match(this.WITH_INDENTS_FULLCONTENT) || [, '', ''];
		let strings: string[] = [];
		let comment = '';
		let endSpaces = '';
		let content = fullContent.replace(this.WITH_STRINGS_COMMENT_ENDSPACES, (match: string, dquote: string, quote: string, semicolon: string, space: string) => {
			if (semicolon) { comment = match; }
			else if (space) { endSpaces = match; }
			else { strings.push(match); }
			return (dquote + dquote) || (quote + quote) || semicolon || ''; // empty string or empty comment result
		});
		Object.assign(this, <LineParser>{
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
			words: content.match(this.WITH_WORDS) || [],
			strings: strings,
			comment: comment,
			endSpaces: endSpaces,
			isBlank: content === '' && comment === ''
		});
	}

	public updateLine(modifyLine: (parsedLine: LineParser) => void) {
		if (modifyLine) {
			modifyLine(this);
		}
		const { indents, content, strings, comment, endSpaces } = this;
		const newText = indents + content.replace(this.WITH_STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		this.newText = newText;
	}
	public trimAfterCutSpaces() {
		let res: RegExpMatchArray | [any, string];
		if (this.cut && (res = this.cut.text.match(this.WITH_CUTTEXT))) {
			let [, newCutText] = res;
			this.cut.newText = newCutText;
		}
	}
	public trimEndSpaces() {
		if (this.isBlank) {
			this.indents = '';
		}
		else {
			this.endSpaces = '';
		}
	}
	public beautify(rules: RegexReplaceRule[]) {
		for (const rule of rules) {
			this.content = this.content.replace(rule[0], rule[1]);
		}
	}
}