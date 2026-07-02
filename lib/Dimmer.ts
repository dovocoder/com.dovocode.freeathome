import { Client } from './Client';
import { Switch } from './Switch';

/**
 * Dimming actuator (FID_DIMMING_ACTUATOR = 0x012 / "0012")
 *
 * Extends Switch for on/off, adds brightness control via:
 *   odp0001 – brightness output (0–100, string)
 *   idp0002 – brightness input  (0–100, string)
 *
 * Homey's `dim` capability uses 0.0–1.0 floats, so getBrightness()
 * returns 0–1 and setBrightness() accepts 0–1.
 */
export class Dimmer extends Switch {
  protected readonly brightnessSensorDatapoint: string = 'odp0001';
  protected readonly brightnessActuatorDatapoint: string = 'idp0002';

  static BRIGHTNESS_CHANGED = 'brightness_changed';

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

  /** Returns brightness as 0.0–1.0 float (for Homey `dim` capability) */
  getBrightness(): number {
    const raw = this.datapoints[this.brightnessSensorDatapoint];
    if (raw == null) return 0;
    const pct = parseFloat(raw);
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, Math.min(1, pct / 100));
  }

  /** Set brightness from 0.0–1.0 float (from Homey `dim` capability) */
  async setBrightness(brightness: number): Promise<void> {
    const clamped = Math.max(0, Math.min(1, brightness));
    const pct = Math.round(clamped * 100);
    const value = pct.toString();
    this.datapoints[this.brightnessSensorDatapoint] = value;
    this.datapoints[this.brightnessActuatorDatapoint] = value;
    await this.client.setValue(this.id, this.channel, this.brightnessActuatorDatapoint, value);
  }

  handleUpdate(datapoint: string, value: any): void {
    super.handleUpdate(datapoint, value);
    if (datapoint === this.brightnessSensorDatapoint) {
      if (value != this.datapoints[datapoint]) {
        this.datapoints[datapoint] = value;
        this.emit(Dimmer.BRIGHTNESS_CHANGED);
      }
    }
  }
}
