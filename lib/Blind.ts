import { Client } from './Client';
import { Shutter } from './Shutter';

/**
 * Blind actuator (FID_BLIND_ACTUATOR = 0x061 / "0061")
 *
 * Extends Shutter for open/close/stop and position, adds slate/lamella
 * tilt control:
 *   odp0002 – slate position output (0–100)
 *   idp0004 – slate position input  (0–100)
 */
export class Blind extends Shutter {
  protected readonly tiltPositionDatapoint: string = 'odp0002';
  protected readonly tiltActuatorDatapoint: string = 'idp0004';

  static TILT_CHANGED = 'tilt_changed';

  constructor(
    public client: Client,
    public id: string,
    public channel: string,
    public name: string,
    public deviceType: string,
    public datapoints: { [key: string]: any },
  ) {
    super(client, id, channel, name, deviceType, datapoints);
  }

  /** Returns tilt position 0–100 */
  getTilt(): number {
    const raw = this.datapoints[this.tiltPositionDatapoint];
    if (raw == null) return 0;
    const pct = parseFloat(raw);
    return Number.isFinite(pct) ? pct : 0;
  }

  /** Set tilt position (0–100) */
  async setTilt(tilt: number): Promise<void> {
    const clamped = Math.max(0, Math.min(100, Math.round(tilt)));
    const value = clamped.toString();
    this.datapoints[this.tiltPositionDatapoint] = value;
    this.datapoints[this.tiltActuatorDatapoint] = value;
    await this.client.setValue(this.id, this.channel, this.tiltActuatorDatapoint, value);
  }

  handleUpdate(datapoint: string, value: any): void {
    super.handleUpdate(datapoint, value);
    if (datapoint === this.tiltPositionDatapoint) {
      if (value != this.datapoints[datapoint]) {
        this.datapoints[datapoint] = value;
        this.emit(Blind.TILT_CHANGED);
      }
    }
  }
}
