const originalSetTimeout = setTimeout;
export function nextEventLoop(): Promise<void> {
    return new Promise(function (resolve): void {
        originalSetTimeout(resolve, 0);
    });
}
