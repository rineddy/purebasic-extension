import { Range, TextDocument } from 'vscode-languageserver';

export class PureBasicRegex {
	/**
     * Create regex parser for code block
     * @param startKeyWords
     */
	public declareBlock() { return this.build(); }
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
			withStartKeyword: (startKeyWords: string[]) => this.build(`${pattern}(?:(?:^|:)[\\t ]*(?<startKeyWord>${startKeyWords.join('|')}))`),
			withEndKeyword: (endKeyWord: string) => this.build(`${pattern}(?:(?:^|:)[\\t ]*(?<endKeyWord>${endKeyWord})|\\Z)`),
			withOptionalType: () => this.build(`${pattern}(?<type>[\\t ]*\\.\\w+)?`),
			withName: (hasPosition: boolean) => this.build(`${hasPosition ? this.group('beforeName', pattern) : pattern}(?<name>[\\w\\d\\u00C0-\\u017F]+)`),
			withBody: (hasPosition: boolean) => this.build(`${hasPosition ? this.group('beforeBody', pattern) : pattern}(?<body>.*?)`),
			andSpaces: () => this.build(`${pattern}[\\t ]+`),
			toRegex: (flags: string = 'gmis') => new RegExp(pattern, flags)
		};
	}
	/**
	 * Build regex to group given pattern
	 * @param groupName
	 * @param groupPattern
	 */
	private group(groupName: string, groupPattern: string) {
		return `(?<${groupName}>${groupPattern})`;
	}
}