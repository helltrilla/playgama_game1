export interface StorageAdapter {
  get(keys: string[]): Promise<Record<string, string | null>>;
  set(keys: string[], values: string[]): Promise<boolean>;
  delete(keys: string[]): Promise<void>;
}

export class InMemoryStorage implements StorageAdapter {
  private data = new Map<string, string>();

  async get(keys: string[]): Promise<Record<string, string | null>> {
    const res: Record<string, string | null> = {};
    for (const k of keys) {
      res[k] = this.data.has(k) ? this.data.get(k)! : null;
    }
    return res;
  }

  async set(keys: string[], values: string[]): Promise<boolean> {
    for (let i = 0; i < keys.length; i++) {
      this.data.set(keys[i], values[i]);
    }
    return true;
  }

  async delete(keys: string[]): Promise<void> {
    for (const k of keys) {
      this.data.delete(k);
    }
  }

  clear(): void {
    this.data.clear();
  }

  dump(): Record<string, string> {
    return Object.fromEntries(this.data.entries());
  }
}
