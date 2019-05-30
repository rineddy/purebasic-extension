import { IndentationRule } from './IndentationRule';

/**
 * Represents Purebasic settings customized by user
 */
export interface DocSettings {
	diagnostics: {
		maxNumberOfProblems: number;
	};
	indentationRules: IndentationRule[];
}