export declare type MessageHandler = (data: any) => void;
export default class MessageBus {
    constructor();
    publish(messageType: string, data: any): void;
    subscribe(messageType: string, messageHandler: MessageHandler): void;
    unsubscribe(messageType: string, messageHandler?: MessageHandler): void;
    private readonly subscriptions;
}
