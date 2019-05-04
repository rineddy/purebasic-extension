import { pb } from './PureBasicAPI';

export class PureBasicParser {
	/**
     * Create regex parser for code block
     * @param startKeyWords
     */
	public createBlock() { return this.create(); }
	/**
     * Create regex parser
     * @param pattern
     */
	private create(pattern: string = '') {
		return {
			withStartKeyword: (startKeyWords: string[]) => this.create(`${pattern}(?:(?:^|:)[\\t ]*(?<startKeyWord>${startKeyWords.join('|')}))`),
			withEndKeyword: (endKeyWord: string) => this.create(`${pattern}(?:(?:^|:)[\\t ]*(?<endKeyWord>${endKeyWord})|\\Z)`),
			withOptionalType: () => this.create(`${pattern}(?<type>[\\t ]*\\.\\w+)?`),
			withName: () => this.create(`${pattern}(?<name>\\w+)`),
			withBody: () => this.create(`${pattern}(?<body>.*?)`),
			andSpaces: () => this.create(`${pattern}[\\t ]+`),
			asPrefix: () => this.create(`(?<prefix>${pattern})`),
			toRegex: (flags: string = 'gmis') => new RegExp(pattern, flags),
			toString: () => pattern
		};
	}
}