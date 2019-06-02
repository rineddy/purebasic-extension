/**
 * Token of document symbol. (symbol building block description)
 */
export interface DocTokenRegex extends RegExp {
}
export namespace DocTokenRegex {
	export const ReturnTypeName = /(?<beforeName>(?:[ \t]*(?<returnType>\.\w+))?[ \t]+)(?<name>[#*]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Name = /(?<beforeName>[ \t]+)(?<name>[#*]?[\w\u00C0-\u017F]+[$]?)/gm;
	export const Path = /(?<beforeName>[ \t]+)(?<name>"(?:[^"\r\n\\]|\\.)*"?)/gm;
}
