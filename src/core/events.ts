export type EventCallback<T = void> = (payload: T) => void;

export class EventBus<Events extends object> {
  private handlers = new Map<keyof Events, Set<EventCallback<unknown>>>();

  on<K extends keyof Events>(event: K, cb: EventCallback<Events[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    const handler = cb as EventCallback<unknown>;
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.handlers.get(event);
    if (!set || set.size === 0) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        console.warn(`[EventBus] Error in handler for event "${String(event)}":`, err);
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}
