import { Client } from './Client';
import { EventEmitter } from 'events';

/**
 * Shutter actuator (FID_SHUTTER_ACTUATOR = 0x009 / "0009")
 *
 * Datapoints (typical SysAP layout):
 *   odp0000 – position state (0–100; 0 = fully open, 100 = fully closed)
 *   idp0001 – move up / open (set to "1")
 *   idp0002 – move down / close (set to "1")
 *   idp0003 – stop (set to "1")
 */
export class Shutter extends EventEmitter {
  protected readonly positionDatapoint: string = 'odp0000';
  protected readonly openDatapoint: string = 'idp0001';
  protected readonly closeDatapoint: string = 'idp0002';
  protected readonly stopDatapoint: string = 'idp0003';

  static OPENED = 'opened';
  static CLOSED = 'closed';
  static STOPPED = 'stopped';

  constructor(
    public client: Client,
    public id: string,
    public channel: string,
    public name: string,
    public deviceType: string,
    public datapoints: { [key: string]: any },
  ) {
    super();
  }

  /** Returns position 0–100 (0 = open, 100 = closed) */
  getPosition(): number {
    const raw = this.datapoints[this.positionDatapoint];
    if (raw == null) return 0;
    const pct = parseFloat(raw);
    return Number.isFinite(pct) ? pct : 0;
  }

  /** True when the shutter is fully closed (position >= 100) */
  isClosed(): boolean {
    return this.getPosition() >= 100;
  }

  /** Returns Homey windowcoverings_state value: 'up', 'down', or 'idle' */
  getState(): string {
    const pos = this.getPosition();
    if (pos >= 100) return 'down';
    if (pos <= 0) return 'up';
    return 'idle';
  }

  async open(): Promise<void> {
    await this.client.setValue(this.id, this.channel, this.openDatapoint, '1');
  }

  async close(): Promise<void> {
    await this.client.setValue(this.id, this.channel, this.closeDatapoint, '1');
  }

  async stop(): Promise<void> {
    await this.client.setValue(this.id, this.channel, this.stopDatapoint, '1');
  }

  handleUpdate(datapoint: string, value: any): void {
    if (datapoint === this.positionDatapoint) {
      if (value != this.datapoints[datapoint]) {
        const oldValue = this.datapoints[datapoint];
        this.datapoints[datapoint] = value;
        const newPos = this.getPosition();
        const oldPos = parseFloat(oldValue);
        if (newPos >= 100 && oldPos < 100) {
          this.emit(Shutter.CLOSED);
        } else if (newPos <= 0 && oldPos > 0) {
          this.emit(Shutter.OPENED);
        } else {
          this.emit(Shutter.STOPPED);
        }
      }
    }
  }
}
