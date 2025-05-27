import formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict';
import { Uri } from 'vscode';
import * as Constants from '../common/constants';
import { SemanticTokenTypes } from '../common/constants';
import { MagitLog } from '../models/magitLog';
import { MagitLogEntry } from '../models/magitLogCommit';
import { MagitRepository } from '../models/magitRepository';
import GitTextUtils from '../utils/gitTextUtils';
import { CommitItemView } from './commits/commitSectionView';
import { DocumentView } from './general/documentView';
import { Token } from './general/semanticTextView';
import { TextView } from './general/textView';

export default class LogView extends DocumentView {

	static UriPath: string = 'log.magit';

	constructor (uri: Uri, log: MagitLog) {
		super(uri);

		this.subViews = [
			new TextView(`Commits in ${log.revName}`),
			...log.entries.map(entry => new CommitLongFormItemView(entry)),
		];
	}

	public update(state: MagitRepository): void { }

	static index = 0;
	static encodeLocation(repository: MagitRepository): Uri {
		return Uri.parse(`${Constants.MagitUriScheme}:${LogView.UriPath}?${repository.uri.fsPath}#${LogView.index++}`);
	}
}

export class CommitLongFormItemView extends CommitItemView {

	constructor (public logEntry: MagitLogEntry) {
		super(logEntry.commit);

		const timeDistance = formatDistanceToNowStrict(logEntry.time);
		const hash = `${GitTextUtils.shortHash(logEntry.commit.hash)} `;
		const graph = logEntry.graph?.[0] ?? '';

		this.content = [];

		const msg = GitTextUtils.shortCommitMessage(logEntry.commit.message);
		this.content.push(`${hash}${graph}`);

		const refTokens: Token[] = logEntry.refs.map(ref => new Token(ref, SemanticTokenTypes.RefName));
		if (refTokens.length) {

			this.content.push(' (');
			refTokens.forEach(refToken => {
				this.content.push(refToken, ' ');
			});
			this.content.pop();

			this.content.push(') ');
		}

		// const availableMsgWidth = 70 - this.content.reduce((prev, v) => prev + v.length, 0);
		const availableMsgWidth = 100;
		const truncatedMsg = truncateCommitText(msg, availableMsgWidth, availableMsgWidth + 1);
		const truncatedAuthor = truncateText(logEntry.author, 17, 18);
		const timeDistancePadding = timeDistance.padEnd(12);
		// const timeDetailString = formatDateTime(logEntry.time);

		// this.content.push(`${timeDistance} ${truncatedAuthor}\n  - ${truncatedMsg}`);
		// this.content.push(`${timeDistancePadding} ${timeDetailString} ${logEntry.author}\n  - ${truncatedMsg}`);
		this.content.push(` ${timeDistancePadding} ${logEntry.author}\n  - ${truncatedMsg}`);

		// Add the rest of the graph for this commit
		if (logEntry.graph) {
			for (let i = 1; i < logEntry.graph.length; i++) {
				const g = logEntry.graph[i];
				const emptyHashSpace = ' '.repeat(8);
				this.content.push(`\n${emptyHashSpace}${g}`);
			}
		}
	}
}

function truncateText(txt: string, limit: number, padEnd?: number) {
	let ret = (txt.length >= limit) ? txt.substr(0, limit - 1) + '…' : txt;
	if (padEnd) {
		ret = ret.padEnd(padEnd);
	}
	return ret;
}

function truncateCommitText(txt: string, limit: number, padEnd?: number, middleSkip?: number) {
	if (txt.length <= limit) {
		return txt;
	}

	if (!middleSkip) {
		middleSkip = 15;
	}
	// get first commit message
	let firstline = txt.split('\n', 1)[0];
	if (firstline.length <= limit) {
		return txt.substring(0, limit);
	}
	// 84 chars + '…' + 15 chars
	// Since issue numbers are often written at the very beginning or at the very end, output them.
	let ret = firstline.substring(0, limit - middleSkip - 5) + ' ……… ' + firstline.substring(firstline.length - middleSkip, firstline.length);
	return ret;
}

function formatDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
