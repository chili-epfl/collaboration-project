import { IChatMessage } from '@jupyter/docprovider';
import { Poll, PollUpdate } from './polls';
import { RoleUpdate } from './roles';
//import { UserActivity } from './cellTracker';

export function msgToString(msg: IChatMessage): string {

    const faultyChar = msg.content.body.includes('♠');

    if (faultyChar) throw new Error(`Message can't contain character ♠`);

    return `icm♠${msg.sender}♠${msg.timestamp}♠${msg.content.body}`;

}

export function stringToMsg(s: string): IChatMessage {

    const parts = s.split('♠');

    if (parts.length !== 4) throw new Error('Invalid input format');

    const [_, sender, timestampString, msg] = parts;
    const timestamp = parseInt(timestampString);

    if (isNaN(timestamp)) throw new Error('Invalid timestamp');

    return {
        sender: sender,
        timestamp: timestamp,
        content: {
            type: 'text',
            body: msg
        }
    }

}

export function pollToString(pll: Poll): string {

    const faultyChar = pll.question.includes('♠') || pll.answers.some(_ => _.includes('♠')) ||
                       pll.answers.some(_ => _.includes('♣'));

    if (faultyChar) throw new Error(`No field can contain character ♠ or ♣`);

    return `pll♠${pll.sender}♠${pll.question}♠${pll.n_answers}♠${pll.answers.join('♣')}♠${pll.total_answers}♠${pll.results.join('♣')}`;

}

export function stringToPoll(s: string): Poll {

    const parts = s.split('♠');

    if (parts.length !== 7) throw new Error('Invalid input format');

    const [_, sender, question, n_answersStr, answersStr, total_answersStr, resultsStr] = parts;

    const n_answers = parseInt(n_answersStr, 10);
    const total_answers = parseInt(total_answersStr, 10);
    const answers = answersStr.split('♣');
    const results = resultsStr.split('♣').map(_ => parseInt(_, 10));

    return {
        sender: sender,
        question: question,
        n_answers: n_answers,
        answers: answers,
        total_answers: total_answers,
        results: results
    }

}

export function pollUpdateToString(upd: PollUpdate): string {

    return `upd♠${upd.index}♠${upd.total_answers}♠${upd.results.join('♣')}`;

}

export function stringToPollUpdate(s: string): PollUpdate {

    const parts = s.split('♠');

    if (parts.length !== 4) throw new Error('Invalid input format');

    const [_, indexStr, total_answersStr, resultsStr] = parts;

    const index = parseInt(indexStr, 10);
    const total_answers = parseInt(total_answersStr, 10);
    const results = resultsStr.split('♣').map(_ => parseInt(_, 10));

    return {
        index: index,
        total_answers: total_answers,
        results: results
    }

}

export function roleUpdateToString(rup: RoleUpdate): string {

    const faultyChar = rup.user.includes('♠') || rup.role.toString().includes('♠');

    if (faultyChar) throw new Error(`No field can contain character ♠ or ♣`);

    return `rup♠${rup.user}♠${rup.role.toString()}`;

}

export function stringToRoleUpdate(s: string): RoleUpdate {

    const parts = s.split('♠');

    if (parts.length !== 3) throw new Error('Invalid input format');

    const [_, user, roleStr] = parts;

    const role = parseInt(roleStr, 10);

    return {
        user: user,
        role: role
    }

}

export function timestampToString(time: number): string {

    return `stamp♠${time.toString()}`;
}

export function stringToTimestamp(s: string): number {

    const parts = s.split('♠');

    if (parts.length !== 2) throw new Error('Invalid input format');

    const [_, timeStr] = parts;

    const time = parseInt(timeStr, 10);

    return time;
}