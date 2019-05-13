import { RegexCapture } from './PureBasicAPI';

declare global {
	interface String {
		capture(regex: RegExp): RegexCapture[];
	}
}
String.prototype.capture = function (regex: RegExp) {
	let result: RegExpExecArray;
	let captures = [];
	while ((result = regex.exec(String(this))) !== null) {
		captures.push({
			text: result[0],
			startPos: result.index,
			endPos: result.index + result[0].length,
		});
	}
	return captures.length > 0 ? captures : null;
};
export { };