import { ICustomLineStruct, ICustomRegexReplacer, pb } from './PureBasicAPI';

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
	public reconstruct(lineText: string, modifyStruct: (lineStruct: ICustomLineStruct) => void): string {
		let lineStruct = this.deconstruct(lineText);
		if (modifyStruct) {
			modifyStruct(lineStruct);
		}
		return this.construct(lineStruct);
	}
	/**
	 * Retrieves line structure data from `linetext` by extracting indents, content, strings, words and comment
	 * @param lineText original text to parse
	 * @returns output structure data
	 */
	public deconstruct(lineText: string): ICustomLineStruct {
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
		return <ICustomLineStruct>{
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
	 * @param lineStruct
	 * @returns output text
	 */
	public construct(lineStruct: ICustomLineStruct): string {
		const { indents, content, strings, comment, endSpaces } = lineStruct;
		const lineText = indents + content.replace(pb.text.FINDS_STRINGS_COMMENT_ENDSPACES, (match: string) => {
			return match[0] === ';' ? comment : strings.shift() || '';
		}) + endSpaces;
		return lineText;
	}
	/**
	 * Beautify line content by replacing substrings
	 * @param lineStruct
	 * @param replacers array of replacement rules
	 */
	public beautify(lineStruct: ICustomLineStruct, replacers: ICustomRegexReplacer[]) {
		for (const replacer of replacers) {
			lineStruct.content = lineStruct.content.replace(replacer[0], replacer[1]);
		}
	}
	/**
	 * Trim end line spaces
	 * @param lineStruct
	 */
	public trimEnd(lineStruct: ICustomLineStruct): any {
		if (lineStruct.isBlank) {
			lineStruct.indents = '';
		}
		else {
			lineStruct.endSpaces = '';
		}
	}
	public simplify(text: string): string {
		const simplifiedText = text.replace(pb.text.FINDS_STRINGS_COMMENTS, match => {
			return match.length > 1 ? match[0] + '-'.repeat(match.length - 2) + match[0] : match[0]; // simplified string or comment
		});
		return simplifiedText;
	}
}