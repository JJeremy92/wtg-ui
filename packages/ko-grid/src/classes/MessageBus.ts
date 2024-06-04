export type MessageHandler = (data: any) => void;

const namespaceDelimiter = '.';

export default class MessageBus {
    public constructor() {
        this.subscriptions = new Map();
    }

    public publish(messageType: string, data: any): void {
        const namespace = getMessageTypeNamespace(messageType);
        if (namespace) {
            const messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
            const messageHandlers = this.subscriptions.get(messageTypePrefix);
            messageHandlers?.get(namespace)?.forEach((handler): void => handler(data));
        } else {
            const messageHandlers = this.subscriptions.get(messageType);
            messageHandlers?.forEach((h): void => h.forEach((handler): void => handler(data)));
        }
    }

    public subscribe(messageType: string, messageHandler: MessageHandler): void {
        const messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
        let messageHandlers = this.subscriptions.get(messageTypePrefix);
        if (!messageHandlers) {
            messageHandlers = new Map();
            this.subscriptions.set(messageTypePrefix, messageHandlers);
        }
        const namespace = getMessageTypeNamespace(messageType);
        let messageHandlersOfNamespace = messageHandlers.get(namespace);
        if (!messageHandlersOfNamespace) {
            messageHandlersOfNamespace = [];
            messageHandlers.set(namespace, messageHandlersOfNamespace);
        }
        messageHandlersOfNamespace.push(messageHandler);
    }

    public unsubscribe(messageType: string, messageHandler?: MessageHandler): void {
        const namespace = getMessageTypeNamespace(messageType);
        if (namespace) {
            const messageTypePrefix = getMessageTypeWithoutNamespace(messageType);
            const messageHandlers = this.subscriptions.get(messageTypePrefix);
            const messageHandlersOfNamespace = messageHandlers?.get(namespace);
            if (messageHandlersOfNamespace) {
                if (messageHandler) {
                    removeAllMessageHandlers(messageHandlersOfNamespace, messageHandler);
                } else {
                    messageHandlers?.delete(namespace);
                }
            }
        } else {
            const messageHandlers = this.subscriptions.get(messageType);
            if (messageHandler) {
                messageHandlers?.forEach((messageHandlersOfNamespace): void => {
                    removeAllMessageHandlers(messageHandlersOfNamespace, messageHandler);
                });
            } else {
                this.subscriptions.delete(messageType);
            }
        }
    }

    private readonly subscriptions: Map<string, Map<string, MessageHandler[]>>;
}

function removeAllMessageHandlers(
    messageHandlers: MessageHandler[],
    messageHandler: MessageHandler
): void {
    let index = -1;
    do {
        index = messageHandlers.indexOf(messageHandler);
        if (index >= 0) {
            messageHandlers.splice(index, 1);
        }
    } while (index !== -1);
}

function getMessageTypeNamespace(messageType: string): string {
    const indexNamespaceDelimiter = messageType.indexOf(namespaceDelimiter);
    return indexNamespaceDelimiter !== -1 ? messageType.substring(indexNamespaceDelimiter) : '';
}

function getMessageTypeWithoutNamespace(messageType: string): string {
    const indexNamespaceDelimiter = messageType.indexOf(namespaceDelimiter);
    return indexNamespaceDelimiter !== -1
        ? messageType.substring(0, indexNamespaceDelimiter)
        : messageType;
}
