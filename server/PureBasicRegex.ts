import { Range, TextDocument } from 'vscode-languageserver';

import { isArray } from 'util';

export class PureBasicRegex {
	/**
     * Create regex parser for code block
     * @param startKeyWords
     */
	public startWith() { return this.build(); }
	/**
	 * Parse regex result to extract data of code block
	 * @param doc
	 * @param regexResult
	 */
	public parseBlock(doc: TextDocument, regexResult: RegExpExecArray) {
		const groups = regexResult['groups'] as {
			startKeyword: string,
			endKeyWord: string,
			type: string,
			name: string,
			body: string,
			beforeBody: string,
			beforeName: string
		};
		const startPos = regexResult.index;
		return {
			startKeyword: { value: groups.startKeyword },
			endKeyWord: { value: groups.endKeyWord },
			type: { value: groups.type },
			whole: {
				value: regexResult[0],
				pos: Range.create(doc.positionAt(startPos), doc.positionAt(startPos + regexResult[0].length))
			},
			name: {
				value: groups.name,
				pos: groups.beforeName !== undefined ? Range.create(doc.positionAt(startPos + groups.beforeName.length), doc.positionAt(startPos + groups.beforeName.length + groups.name.length)) : undefined
			},
			body: {
				value: groups.body,
				pos: groups.beforeBody !== undefined ? Range.create(doc.positionAt(startPos + groups.beforeBody.length), doc.positionAt(startPos + groups.beforeBody.length + groups.body.length)) : undefined,
			},
			positions: {
				name: groups.beforeName !== undefined ? Range.create(doc.positionAt(startPos + groups.beforeName.length), doc.positionAt(startPos + groups.beforeName.length + groups.name.length)) : undefined,
				body: groups.beforeBody !== undefined ? Range.create(doc.positionAt(startPos + groups.beforeBody.length), doc.positionAt(startPos + groups.beforeBody.length + groups.body.length)) : undefined,
			},
		};
	}
	/**
     * Build regex pattern
     * @param pattern
     */
	private build(pattern: string = '') {
		return {
			newLine: (isIndented: boolean = true) => this.build(`${pattern}(?:^|:)${isIndented ? '[\\t ]*' : ''}`),
			spaces: (isOptional: boolean = false) => this.build(`${pattern}[\\t ]${isOptional ? '*' : '+'}`),
			type: (isOptional: boolean = true) => this.build(`${pattern}(?<type>[\\t ]*\\.\\w+)${isOptional ? '?' : ''}`),
			keyword: (keyWords: string[] | string) => this.build(`${pattern}${isArray(keyWords) ? `(?<keyword>${keyWords.join('|')})` : keyWords}`),
			name: () => this.build(`(?<beforeName>${pattern})(?<name>[\\w\\d\\u00C0-\\u017F]+)`),
			toRegex: (flags: string = 'gmis') => new RegExp(pattern, flags)
		};
	}
}