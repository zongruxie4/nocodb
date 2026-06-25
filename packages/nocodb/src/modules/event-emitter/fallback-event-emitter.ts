import { Logger } from '@nestjs/common';
import Emittery from 'emittery';
import type { IEventEmitter } from './event-emitter.interface';

export class FallbackEventEmitter implements IEventEmitter {
  private readonly emitter: Emittery;

  private readonly logger = new Logger(FallbackEventEmitter.name);

  constructor() {
    this.emitter = new Emittery();
  }

  emit(event: string, data: any): void {
    // `emit` is fire-and-forget (returns void), but `Emittery.emit` returns a
    // promise that rejects if ANY listener rejects (it does
    // `await Promise.all(listeners)`). Discarding that promise means a single
    // throwing listener — e.g. `checkLimit` raising `Forbidden` inside the
    // `HANDLE_WEBHOOK` handler — surfaces as an `unhandledRejection` that takes
    // the whole process down. Attach a catch so one misbehaving listener can
    // never crash the server; listeners that need their own error context still
    // wrap their own bodies.
    //
    // Snapshot the emit call site NOW: once a listener rejects asynchronously,
    // the caller's frames are gone, so the rejection only carries the listener
    // chain (e.g. handleHooks → checkLimit) — never which code fired the event.
    // Building the Error is cheap; V8 formats `.stack` lazily, so the hot path
    // only pays when a listener actually rejects.
    const emitSite = new Error();
    this.emitter.emit(event, data).catch((e) => {
      this.logger.error(
        `Unhandled error in '${event}' event listener: ${e?.message ?? e}`,
        // listener stack = the actual failure; emit-site stack = the caller
        [e?.stack, `Emitted from:${emitSite.stack?.replace(/^Error/, '')}`]
          .filter(Boolean)
          .join('\n'),
      );
    });
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.emitter.on(event, listener);
    return () => this.emitter.off(event, listener);
  }

  removeListener(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }

  removeAllListeners(event?: string): void {
    this.emitter.clearListeners(event);
  }
}
