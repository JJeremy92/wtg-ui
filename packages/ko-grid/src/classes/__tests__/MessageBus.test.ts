import MessageBus from '../messageBus';

describe('messageBus', () => {
    test('publish and subscription', () => {
        const messageBus = new MessageBus();
        expect(() => messageBus.publish('messageTypeNotExist', 'test data')).not.toThrow();
    });

    test('publish and subscription', () => {
        const messageBus = new MessageBus();
        const handler = jest.fn();
        messageBus.subscribe('messageType1', handler);
        messageBus.publish('messageType1', 'test data');
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith('test data');
    });

    test('publishing with namespace should only execute the ones with the namespace', () => {
        const messageBus = new MessageBus();
        const handler1 = jest.fn();
        const handler2 = jest.fn();
        messageBus.subscribe('messageType1', handler1);
        messageBus.subscribe('messageType1.namespace', handler2);
        messageBus.publish('messageType1.namespace', 'test data');

        expect(handler1).not.toHaveBeenCalled();
        expect(handler2).toHaveBeenCalledTimes(1);
        expect(handler2).toHaveBeenCalledWith('test data');
    });

    test('two subscriptions without namespaces should execute both of them', () => {
        const messageBus = new MessageBus();
        const messageHandler1 = jest.fn();
        const messageHandler2 = jest.fn();
        messageBus.subscribe('messageType', messageHandler1);
        messageBus.subscribe('messageType', messageHandler2);
        messageBus.publish('messageType', 'test data');
        expect(messageHandler1).toHaveBeenCalledTimes(1);
        expect(messageHandler1).toHaveBeenCalledWith('test data');
        expect(messageHandler2).toHaveBeenCalledTimes(1);
        expect(messageHandler2).toHaveBeenCalledWith('test data');

        messageBus.unsubscribe('messageType');
    });

    test('two subscriptions one with namespace should call both handlers', () => {
        const messageBus = new MessageBus();
        const messageHandler1 = jest.fn();
        const messageHandler2 = jest.fn();

        messageBus.subscribe('messageType.myNamespace', messageHandler1);
        messageBus.subscribe('messageType', messageHandler2);
        messageBus.publish('messageType', 'test data');

        expect(messageHandler1).toHaveBeenCalledTimes(1);
        expect(messageHandler1).toHaveBeenCalledWith('test data');
        expect(messageHandler2).toHaveBeenCalledTimes(1);
        expect(messageHandler2).toHaveBeenCalledWith('test data');
    });

    test('unsubcription two with namespace and no handler provided should only unsubscribe the ones with namespace', () => {
        const messageBus = new MessageBus();
        const messageHandler1 = jest.fn();
        const messageHandler2 = jest.fn();
        const messageHandler3 = jest.fn();
        messageBus.subscribe('messageType.namespace', messageHandler1);
        messageBus.subscribe('messageType.namespace', messageHandler2);
        messageBus.subscribe('messageType', messageHandler3);
        messageBus.publish('messageType', 'test data');

        expect(messageHandler1).toHaveBeenCalledTimes(1);
        expect(messageHandler2).toHaveBeenCalledTimes(1);
        expect(messageHandler3).toHaveBeenCalledTimes(1);
        messageHandler1.mockClear();
        messageHandler2.mockClear();
        messageHandler3.mockClear();

        messageBus.unsubscribe('messageType.namespace');
        messageBus.publish('messageType', 'test data 1');
        expect(messageHandler1).not.toBeCalled();
        expect(messageHandler2).not.toBeCalled();
        expect(messageHandler3).toHaveBeenCalledTimes(1);
    });

    test('unsubcription two with namespace and same handler in all of them should only unsubscribe the ones with namespace', () => {
        const messageBus = new MessageBus();
        const messageHandlerToDelete = jest.fn();
        const messageHandler = jest.fn();
        messageBus.subscribe('messageType.namespace', messageHandlerToDelete);
        messageBus.subscribe('messageType.namespace', messageHandlerToDelete);
        messageBus.subscribe('messageType', messageHandler);
        messageBus.publish('messageType', 'test data');

        expect(messageHandlerToDelete).toHaveBeenCalledTimes(2);
        expect(messageHandler).toHaveBeenCalledTimes(1);
        messageHandlerToDelete.mockClear();
        messageHandler.mockClear();

        messageBus.unsubscribe('messageType.namespace', messageHandlerToDelete);
        messageBus.publish('messageType', 'test data 1');
        expect(messageHandlerToDelete).not.toBeCalled();
        expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    test('unsubcription two without namespace and same handler in all of them should only unsubscribe the ones with namespace', () => {
        const messageBus = new MessageBus();
        const messageHandlerToDelete = jest.fn();
        const messageHandler = jest.fn();
        messageBus.subscribe('messageType', messageHandlerToDelete);
        messageBus.subscribe('messageType', messageHandlerToDelete);
        messageBus.subscribe('messageType.namespace', messageHandler);
        messageBus.publish('messageType', 'test data');

        expect(messageHandlerToDelete).toHaveBeenCalledTimes(2);
        expect(messageHandler).toHaveBeenCalledTimes(1);
        messageHandlerToDelete.mockClear();
        messageHandler.mockClear();

        messageBus.unsubscribe('messageType', messageHandlerToDelete);
        messageBus.publish('messageType', 'test data 1');
        expect(messageHandlerToDelete).not.toBeCalled();
        expect(messageHandler).toHaveBeenCalledTimes(1);
    });

    test('unsubcription one with namespace when handler provided should only unsubscribe the specific one', () => {
        const messageBus = new MessageBus();
        const messageHandler1 = jest.fn();
        const messageHandler2 = jest.fn();
        const messageHandler3 = jest.fn();
        messageBus.subscribe('messageType.namespace', messageHandler1);
        messageBus.subscribe('messageType.namespace', messageHandler2);
        messageBus.subscribe('messageType', messageHandler3);
        messageBus.publish('messageType', 'test data');

        expect(messageHandler1).toHaveBeenCalledTimes(1);
        expect(messageHandler2).toHaveBeenCalledTimes(1);
        expect(messageHandler3).toHaveBeenCalledTimes(1);
        messageHandler1.mockClear();
        messageHandler2.mockClear();
        messageHandler3.mockClear();

        messageBus.unsubscribe('messageType.namespace', messageHandler1);
        messageBus.publish('messageType', 'test data 1');
        expect(messageHandler1).not.toBeCalled();
        expect(messageHandler2).toHaveBeenCalledTimes(1);
        expect(messageHandler3).toHaveBeenCalledTimes(1);
    });

    test('unsubcription without namespace but handler provided', () => {
        const messageBus = new MessageBus();
        const messageHandler = jest.fn();
        messageBus.subscribe('messageType1', messageHandler);
        messageBus.publish('messageType1', 'test data');

        expect(messageHandler).toHaveBeenCalledTimes(1);
        expect(messageHandler).toHaveBeenCalledWith('test data');

        messageHandler.mockClear();

        messageBus.unsubscribe('messageType1', messageHandler);
        messageBus.publish('messageType1', 'test data 1');
        expect(messageHandler).not.toBeCalled();
    });

    test('unsubcription a non-exist message type', () => {
        const messageBus = new MessageBus();
        const messageHandler = jest.fn();
        expect(() => messageBus.unsubscribe('messageType', messageHandler)).not.toThrow();
    });

    test('unsubcription with a non-exist handler', () => {
        const messageBus = new MessageBus();
        const messageHandler = jest.fn();

        messageBus.subscribe('messageType', messageHandler);
        expect(() => messageBus.unsubscribe('messageType', () => {})).not.toThrow();

        messageBus.publish('messageType', 'test data');
        expect(messageHandler).toHaveBeenCalledTimes(1);
        expect(messageHandler).toHaveBeenCalledWith('test data');
    });
});
