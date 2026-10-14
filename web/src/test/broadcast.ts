/**
 * An in-memory `BroadcastChannel` for tests (T-M2.12): like the browser's, a message reaches every other open instance
 * with the same name (asynchronously, as a structured clone), never the sender. Node's own one would cross test files'
 * module state and keep the process alive. `reset()` closes every instance between tests.
 */
export class FakeBroadcastChannel extends EventTarget {
  static open = new Set<FakeBroadcastChannel>()
  onmessage: ((event: MessageEvent) => void) | null = null
  closed = false
  readonly name: string

  constructor(name: string) {
    super()
    this.name = name
    FakeBroadcastChannel.open.add(this)
  }

  postMessage(data: unknown) {
    if (this.closed) throw new DOMException('closed', 'InvalidStateError')
    for (const other of FakeBroadcastChannel.open) {
      if (other === this || other.name !== this.name) continue
      const clone = structuredClone(data)
      setTimeout(() => {
        if (other.closed) return
        const event = new MessageEvent('message', { data: clone })
        other.onmessage?.(event)
        other.dispatchEvent(event)
      })
    }
  }

  close() {
    this.closed = true
    FakeBroadcastChannel.open.delete(this)
  }

  static reset() {
    for (const channel of [...FakeBroadcastChannel.open]) channel.close()
  }
}
