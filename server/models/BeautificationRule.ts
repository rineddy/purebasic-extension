/**
 * Represents regex replacer
 * @example let rule: BeautificationRule = [ /\s(\w+)/g, '$1' ]
 */
export interface BeautificationRule {
	0: RegExp;
	1: string;
}
