import { IChatMessage } from '@jupyter/docprovider';

export function msgToString(msg: IChatMessage): string {

    const faultyPosition = msg.content.body.indexOf('♠');

    if (faultyPosition >= 0) throw new Error('Illegal character at position ' + faultyPosition);

    return 'icm' + '♠' + msg.sender + '♠' + msg.timestamp + '♠' + msg.content.body;

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