import { Position, Range, TextDocument } from 'vscode-languageserver';

import { isUndefined } from 'util';
import { pb } from './PureBasicAPI';

export class PureBasicParser {
	/**
     * Create regex parser for code block
     * @param startKeyWords
     */
	public declareBlock() { return this.build(); }

	public parseResult(doc: TextDocument, result: RegExpExecArray) {
		const groups = result['groups'] as {
			startKeyword: string,
			endKeyWord: string,
			type: string,
			name: string,
			body: string,
			beforeBody: string,
			beforeName: string
		};
		const hasNamePosition: boolean = groups.beforeName !== undefined && groups.name !== undefined;
		const hasBodyPosition: boolean = groups.beforeBody !== undefined && groups.body !== undefined;
		const posStart = result.index;
		const ranges = {
			block: Range.create(doc.positionAt(posStart), doc.positionAt(posStart + result[0].length)),
			name: hasNamePosition ? Range.create(doc.positionAt(posStart + groups.beforeName.length), doc.positionAt(posStart + groups.beforeName.length + groups.name.length)) : undefined,
			body: hasBodyPosition ? Range.create(doc.positionAt(posStart + groups.beforeBody.length), doc.positionAt(posStart + groups.beforeBody.length + groups.body.length)) : undefined,
		};
		return {
			groups: groups,
			ranges: ranges,
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
			withName: (hasPosition: boolean = true) => this.build(`${hasPosition ? this.group('beforeName', pattern) : pattern}(?<name>\\w+)`),
			withBody: (hasPosition: boolean = true) => this.build(`${hasPosition ? this.group('beforeBody', pattern) : pattern}(?<body>.*?)`),
			andSpaces: () => this.build(`${pattern}[\\t ]+`),
			beforeName: () => this.build(`(?<beforeName>${pattern})`),
			beforeBody: () => this.build(`(?<beforeBody>${pattern})`),
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