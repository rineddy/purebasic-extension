import { ParsedText, pb } from './PureBasicAPI';

import { TextDocument } from 'vscode-languageserver';

export class PureBasicText {
	/**
	 * Find strings or cut strings
	 */
	private readonly WITH_STRINGS = /"(?:[^"\r\n\\]|\\.)*"?|'[^\r\n']*'?/gm;
	/**
	 * Find comments
	 */
	private readonly WITH_COMMENTS = /;.*?$/gm;

	/**
	 * Read document text to parse
	 * @param doc
	 */
	public parseText(doc: TextDocument): ParsedText {
		const readText = doc.getText();
		return <ParsedText>{
			text: readText,
			comments: readText.capture(pb.text.WITH_COMMENTS) || [],
			strings: readText.capture(pb.text.WITH_STRINGS) || []
		};
	}
}