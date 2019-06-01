import { IndentationRule } from './IndentationRule';

/**
 * Represents Purebasic settings customized by user
 */
export interface PurebasicSettings {
	diagnostics: {
		maxNumberOfProblems: number;
	};
	indentationRules: IndentationRule[];
}
export namespace PurebasicSettings {
	export const Default = <PurebasicSettings>{
		diagnostics: {
			maxNumberOfProblems: 1000
		},
		indentationRules: [
			{
				regex: /^;>\s*/i,
				before: 0, after: 1
			},
			{
				regex: /^;<\s*/i,
				before: -1, after: 0
			}
		]
	};
}
