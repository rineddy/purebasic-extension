import { ICustomRegexReplacer, ParsedLine, pb } from './PureBasicAPI';

export class PureBasicText {
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
	 * Retrieves line text after some structure data modifications
	 * @param lineText original text to parse
	 * @param modifyStruct function to modify line structure data
	 * @returns output text
	 */
	public reconstruct(lineText: string, modifyStruct: (parsedLine: ParsedLine) => void): string {
		let parsedLine = this.deconstruct(lineText);
		if (modifyStruct) {
			modifyStruct(parsedLine);
		}
		return this.construct(parsedLine);
	}
	/**
	 * Retrieves line structure data from `linetext` by extracting indents, content, strings, words and comment
	 * @param lineText original text to parse
	 * @returns output structure data
	 */
	public deconstruct(lineText: string): ParsedLine {
		let [, indents, fullContent] = lineText.match(pb.text.EXTRACTS_INDENTS_FULLCONTENT) || [, '', ''];
		let strings: string[] = [];
		let comment = '';
		let endSpaces = '';
		let content = fullContent.replace(pb.text.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string, dquote: string, quote: string, semicolon: string, space: string) => {
			if (semicolon) {
				comment = match;
			}
			else if (space) {
				endSpaces = match;
			}
			else {
				strings.push(match);
			}
			return (dquote + dquote) || (quote + quote) || semicolon || ''; // empty string or empty comment result
		});
		return <ParsedLine>{
			indents: indents,
			content: content,
			words: content.match(pb.text.EXTRACTS_WORDS) || [],
			strings: strings,
			comment: comment,
			endSpaces: endSpaces,
			isBlank: content === '' && comment === ''
		};
	}
	/**
	 * Retrieves line text by combining indents, content, strings and comment from `lineStruct`
	 * @param parsedLine
	 * @returns output text
	 */
	public construct(parsedLine: ParsedLine): string {
		const { indents, content, strings, comment, endSpaces } = parsedLine;
		const lineText = indents + content.replace(pb.text.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		return lineText;
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
	public trimEnd(parsedLine: ParsedLine): any {
		if (parsedLine.isBlank) {
			parsedLine.indents = '';
		}
		else {
			parsedLine.endSpaces = '';
		}
	}
	public simplify(text: string): string {
		const simplifiedText = text.replace(pb.text.FINDS_STRINGS_COMMENTS, match => {
			return match.length > 1 ? match[0] + '-'.repeat(match.length - 2) + match[0] : match[0]; // simplified string or comment
		});
		return simplifiedText;
	}
}