import { Client } from './Client';
import { EventEmitter } from 'events';

/**
 * Contact sensor / window-door sensor
 * (FID_WINDOW_DOOR_SENSOR = 0x00F / "000F")
 *
 * Sensor-only device; maps to Homey `alarm_contact` capability.
 *   odp0000 – alarm_contact state ("1"=open, "0"=closed)
 */
export class ContactSensor extends EventEmitter {
  protected readonly alarmDatapoint: string = 'odp0000';

  protected readonly onValue: string = '1';
  protected readonly offValue: string = '0';

  static OPENED = 'opened';
  static CLOSED = 'closed';

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

  /** Returns true when the contact is open */
  isOpen(): boolean {
    return this.datapoints[this.alarmDatapoint] === this.onValue;
  }

  handleUpdate(datapoint: string, value: any): void {
    if (datapoint === this.alarmDatapoint) {
      if (value === this.onValue) {
        if (value != this.datapoints[datapoint]) {
          this.datapoints[datapoint] = value;
          this.emit(ContactSensor.OPENED);
        }
      } else if (value === this.offValue) {
        if (value != this.datapoints[datapoint]) {
          this.datapoints[datapoint] = value;
          this.emit(ContactSensor.CLOSED);
        }
      }
    }
  }
}
